import { prisma } from '@cinehub/db';
import { getRedisClient } from '../../platform/cache/redis.js';
import { forceDeleteSeatLeases } from '../../platform/cache/seat-lease.js';
import { AppError } from '../../platform/utils/errors.js';
import { logger } from '../../platform/observability/logger.js';
import {
  checkoutBooking,
  formatBookingTicketDto,
  sweepExpiredBookings,
  broadcastShowtimeSeatEvent,
  processPendingOutboxEvents,
} from '../booking/index.js';

const memoryIdempotency = new Set();

function normalizeProvider(provider) {
  const p = String(provider || 'VNPAY').toUpperCase();
  if (['MOMO', 'ZALOPAY', 'VNPAY'].includes(p)) return p;
  return 'VNPAY';
}

/**
 * Ensures a Booking and a Payment record (`status = PENDING`) exist in MySQL
 * when initiating a payment session.
 */
export async function createGatewayPaymentRecord({
  bookingId,
  showtimeId,
  userId,
  userEmail,
  seatIds,
  voucherCode,
  concessions,
  provider,
  txnRef,
  amount,
}) {
  await sweepExpiredBookings();

  const cleanBookingRef = String(bookingId || '').split('_')[0];
  let booking = cleanBookingRef
    ? await prisma.booking.findFirst({
        where: {
          OR: [{ id: cleanBookingRef }, { code: cleanBookingRef }],
        },
        include: { seats: true, concessions: true },
      })
    : null;

  if (!booking && showtimeId && userId) {
    const checkedOut = await checkoutBooking({
      showtimeId,
      userId,
      userEmail,
      seatIds,
      voucherCode,
      concessions,
    });
    booking = await prisma.booking.findUnique({
      where: { id: checkedOut.bookingId },
      include: { seats: true, concessions: true },
    });
  }

  if (!booking && userId) {
    booking = await prisma.booking.findFirst({
      where: { userId, status: 'PENDING' },
      include: { seats: true, concessions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!booking) {
    return null;
  }

  if (booking.status === 'PENDING' && booking.expiresAt <= new Date()) {
    await sweepExpiredBookings();
    throw new AppError(409, 'HOLD_EXPIRED', 'Thời gian giữ ghế đã hết hạn.');
  }

  const dbProvider = normalizeProvider(provider);
  const paymentAmount =
    booking.totalAmount > 0 ? booking.totalAmount : Math.round(Number(amount || 0));

  const payment = await prisma.payment.upsert({
    where: { txnRef },
    update: {
      status: 'PENDING',
      amount: paymentAmount,
    },
    create: {
      bookingId: booking.id,
      provider: dbProvider,
      status: 'PENDING',
      amount: paymentAmount,
      txnRef,
    },
  });

  return { booking, payment };
}

/**
 * WS6: Verifies idempotency (Redis + PaymentWebhookEvent + Payment.successLock),
 * confirms or fails payment in MySQL, issues cryptographic QR Tickets, or creates a Refund on late IPN.
 */
export async function confirmOrFailPayment({
  provider,
  txnRef,
  bookingIdOrCode,
  isSuccess,
  providerTxnNo = null,
  rawPayload = {},
  signatureValid = true,
  eventKey,
}) {
  const dbProvider = normalizeProvider(provider);
  const resolvedEventKey =
    eventKey ||
    `${txnRef || bookingIdOrCode}:${providerTxnNo || rawPayload?.transId || rawPayload?.vnp_TransactionNo || (isSuccess ? 'SUCCESS' : 'FAIL')}`;
  const redisIdemKey = `idem:pay:${dbProvider}:${resolvedEventKey}`;

  if (!signatureValid) {
    await prisma.paymentWebhookEvent
      .upsert({
        where: {
          provider_eventKey: {
            provider: dbProvider,
            eventKey: resolvedEventKey.slice(0, 120),
          },
        },
        update: { signatureValid: false },
        create: {
          provider: dbProvider,
          eventKey: resolvedEventKey.slice(0, 120),
          txnRef: txnRef ? String(txnRef).slice(0, 64) : null,
          payload: rawPayload,
          signatureValid: false,
        },
      })
      .catch(() => {});
    throw new AppError(400, 'VALIDATION_ERROR', 'Chữ ký thanh toán (HMAC) không hợp lệ.');
  }

  // Tier 1: Redis fast idempotency check
  let isDuplicateRedis = false;
  try {
    const redis = getRedisClient();
    const setRes = await redis.set(redisIdemKey, '1', 'NX', 'EX', 86400);
    if (setRes === null) isDuplicateRedis = true;
  } catch {
    if (memoryIdempotency.has(redisIdemKey)) {
      isDuplicateRedis = true;
    } else {
      memoryIdempotency.add(redisIdemKey);
    }
  }

  // Locate target Payment and Booking
  let payment = txnRef
    ? await prisma.payment.findUnique({
        where: { txnRef: String(txnRef).slice(0, 64) },
      })
    : null;

  const candidateRef =
    bookingIdOrCode || (txnRef ? String(txnRef).split('_')[0] : '') || rawPayload?.bookingId || '';

  let booking = await prisma.booking.findFirst({
    where: {
      OR: [
        ...(payment ? [{ id: payment.bookingId }] : []),
        ...(candidateRef ? [{ id: candidateRef }, { code: candidateRef }] : []),
      ],
    },
    include: {
      seats: true,
      concessions: true,
      tickets: true,
      redemption: true,
      payments: { orderBy: { createdAt: 'desc' } },
      showtime: {
        include: {
          movie: true,
          cinema: true,
          auditorium: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!booking) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy đơn đặt vé tương ứng với giao dịch.');
  }

  // Tier 2: Check PaymentWebhookEvent processedAt
  const existingWebhook = await prisma.paymentWebhookEvent.findUnique({
    where: {
      provider_eventKey: {
        provider: dbProvider,
        eventKey: resolvedEventKey.slice(0, 120),
      },
    },
  });

  if ((isDuplicateRedis || existingWebhook?.processedAt) && booking.status === 'CONFIRMED') {
    return {
      success: true,
      idempotentReplay: true,
      status: 'CONFIRMED',
      bookingId: booking.id,
      bookingCode: booking.code,
      ticket: formatBookingTicketDto(booking),
    };
  }

  // Record webhook event
  await prisma.paymentWebhookEvent.upsert({
    where: {
      provider_eventKey: {
        provider: dbProvider,
        eventKey: resolvedEventKey.slice(0, 120),
      },
    },
    update: {
      payload: rawPayload,
      signatureValid: true,
    },
    create: {
      provider: dbProvider,
      eventKey: resolvedEventKey.slice(0, 120),
      txnRef: (txnRef || payment?.txnRef || booking.code).slice(0, 64),
      payload: rawPayload,
      signatureValid: true,
    },
  });

  // Ensure Payment row exists
  if (!payment) {
    const fallbackTxnRef = (txnRef || `${booking.code}_${Date.now()}`).slice(0, 64);
    payment = await prisma.payment.upsert({
      where: { txnRef: fallbackTxnRef },
      update: {},
      create: {
        bookingId: booking.id,
        provider: dbProvider,
        status: 'PENDING',
        amount: booking.totalAmount,
        txnRef: fallbackTxnRef,
      },
    });
  }

  // Case A: Payment failed or cancelled by user -> mark Payment FAILED, keep Booking PENDING so user can retry!
  if (!isSuccess) {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureCode: String(
            rawPayload?.resultCode ?? rawPayload?.vnp_ResponseCode ?? 'PAYMENT_FAILED',
          ).slice(0, 50),
          rawResponse: rawPayload,
        },
      }),
      prisma.paymentWebhookEvent.update({
        where: {
          provider_eventKey: {
            provider: dbProvider,
            eventKey: resolvedEventKey.slice(0, 120),
          },
        },
        data: { processedAt: new Date() },
      }),
    ]);

    return {
      success: false,
      status: 'FAILED',
      bookingId: booking.id,
      bookingCode: booking.code,
      message: 'Giao dịch thanh toán không thành công. Ghế của bạn vẫn đang được giữ để thử lại.',
    };
  }

  // Sweep expired bookings before confirming
  if (booking.status === 'PENDING' && booking.expiresAt <= new Date()) {
    await sweepExpiredBookings();
    booking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        seats: true,
        concessions: true,
        tickets: true,
        redemption: true,
        payments: true,
        showtime: { include: { movie: true, cinema: true, auditorium: true } },
      },
    });
  }

  // Case B: Late payment IPN arrives AFTER booking expired/cancelled -> create Refund!
  if (booking.status === 'EXPIRED' || booking.status === 'CANCELLED') {
    const refund = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          paidAt: new Date(),
          providerTxnNo: providerTxnNo ? String(providerTxnNo).slice(0, 100) : null,
          rawResponse: rawPayload,
        },
      });
      const createdRefund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          reason: 'LATE_PAYMENT_AFTER_HOLD_EXPIRY',
          status: 'REQUESTED',
        },
      });
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'Refund',
          aggregateId: createdRefund.id,
          eventType: 'LatePaymentRefundRequested',
          payload: {
            bookingId: booking.id,
            paymentId: payment.id,
            refundId: createdRefund.id,
            amount: payment.amount,
          },
        },
      });
      await tx.paymentWebhookEvent.update({
        where: {
          provider_eventKey: {
            provider: dbProvider,
            eventKey: resolvedEventKey.slice(0, 120),
          },
        },
        data: { processedAt: new Date() },
      });
      return createdRefund;
    });

    return {
      success: false,
      status: 'REFUND_REQUESTED',
      bookingId: booking.id,
      bookingCode: booking.code,
      refundId: refund.id,
      message:
        'Đơn giữ ghế đã hết hạn trước khi thanh toán hoàn tất. Hệ thống đã tạo yêu cầu hoàn tiền tự động.',
    };
  }

  // Case C: Already confirmed -> idempotent return
  if (booking.status === 'CONFIRMED') {
    return {
      success: true,
      idempotentReplay: true,
      status: 'CONFIRMED',
      bookingId: booking.id,
      bookingCode: booking.code,
      ticket: formatBookingTicketDto(booking),
    };
  }

  // Case D: Atomic Confirmation (PENDING -> CONFIRMED, HELD -> SOLD, RESERVED -> REDEEMED, Ticket issued)
  const confirmedBooking = await prisma.$transaction(async (tx) => {
    const now = new Date();

    // Tier 3: Payment.successLock unique constraint (booking.id)
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        successLock: booking.id,
        paidAt: now,
        providerTxnNo: providerTxnNo ? String(providerTxnNo).slice(0, 100) : null,
        rawResponse: rawPayload,
      },
    });

    const showtimeSeatIds = booking.seats.map((bs) => bs.showtimeSeatId);
    if (showtimeSeatIds.length > 0) {
      await tx.showtimeSeat.updateMany({
        where: { id: { in: showtimeSeatIds } },
        data: {
          status: 'SOLD',
          heldUntil: null,
          version: { increment: 1 },
        },
      });
    }

    if (booking.redemption && booking.redemption.status === 'RESERVED') {
      await tx.voucherRedemption.update({
        where: { id: booking.redemption.id },
        data: { status: 'REDEEMED' },
      });
    }

    for (const bs of booking.seats) {
      await tx.ticket.upsert({
        where: { bookingSeatId: bs.id },
        update: { status: 'VALID' },
        create: {
          bookingId: booking.id,
          bookingSeatId: bs.id,
          qrVersion: 1,
          status: 'VALID',
          issuedAt: now,
        },
      });
    }

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: now,
        version: { increment: 1 },
      },
      include: {
        seats: true,
        concessions: true,
        tickets: true,
        payments: { orderBy: { createdAt: 'desc' } },
        showtime: {
          include: {
            movie: true,
            cinema: true,
            auditorium: true,
          },
        },
      },
    });

    await tx.outboxEvent.create({
      data: {
        aggregateType: 'Booking',
        aggregateId: booking.id,
        eventType: 'BookingConfirmed',
        payload: {
          bookingId: booking.id,
          bookingCode: booking.code,
          userId: booking.userId,
          showtimeId: booking.showtimeId,
          seatIds: booking.seats.map((s) => s.seatLabel),
          totalAmount: booking.totalAmount,
        },
      },
    });

    if (booking.userId) {
      await tx.notification.create({
        data: {
          userId: booking.userId,
          type: 'BOOKING_CONFIRMED',
          title: `Đặt vé thành công #${booking.code}`,
          body: `${updated.showtime?.movie?.title || 'Phim'} · Ghế: ${booking.seats.map((s) => s.seatLabel).join(', ')}`,
          linkUrl: `/result/${updated.tickets[0]?.id || booking.id}`,
        },
      });
    }

    await tx.paymentWebhookEvent.update({
      where: {
        provider_eventKey: {
          provider: dbProvider,
          eventKey: resolvedEventKey.slice(0, 120),
        },
      },
      data: { processedAt: now },
    });

    return updated;
  });

  const soldLabels = confirmedBooking.seats.map((bs) => bs.seatLabel);
  await forceDeleteSeatLeases({
    showtimeId: confirmedBooking.showtimeId,
    seatIds: soldLabels,
  });

  // WS3: Broadcast SEATS_SOLD in real time so other browsers immediately see F7, F8 as SOLD
  await broadcastShowtimeSeatEvent(
    [confirmedBooking.showtimeId, confirmedBooking.showtime?.externalId],
    {
      type: 'SEATS_SOLD',
      showtimeId: confirmedBooking.showtimeId,
      externalShowtimeId: confirmedBooking.showtime?.externalId,
      bookingId: confirmedBooking.id,
      soldSeatIds: soldLabels,
    },
  );

  // Trigger Outbox email dispatch asynchronously
  void processPendingOutboxEvents().catch((err) => {
    logger.warn({ err: err.message }, '[PaymentService] Outbox relay error');
  });

  return {
    success: true,
    status: 'CONFIRMED',
    bookingId: confirmedBooking.id,
    bookingCode: confirmedBooking.code,
    ticket: formatBookingTicketDto(confirmedBooking),
  };
}
