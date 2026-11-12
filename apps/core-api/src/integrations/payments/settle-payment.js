import { prisma } from '@cinehub/db';
import { logger } from '../../platform/observability/logger.js';
import { buildQr } from '../../platform/utils/qr.js';
import { sendBookingConfirmationEmail } from '../../platform/mail/mailer.js';

/**
 * Idempotently settle a payment and transition booking/seats/tickets.
 *
 * @param {Object} params
 * @param {string} params.txnRef - Unique merchant transaction reference
 * @param {string} params.provider - Payment provider ('MOMO' | 'VNPAY' | 'ZALOPAY')
 * @param {boolean} params.isSuccess - Gateway reported payment success
 * @param {string} [params.providerTxnNo]
 * @param {string} [params.bankCode]
 * @param {string} [params.failureCode]
 * @param {Record<string, any>} [params.rawResponse]
 * @returns {Promise<{ settled: boolean, payment: any, booking: any }>}
 */
export async function settlePayment({
  txnRef,
  provider,
  isSuccess,
  providerTxnNo,
  bankCode,
  failureCode,
  rawResponse,
}) {
  const existingPayment = await prisma.payment.findUnique({
    where: { txnRef },
    include: {
      booking: {
        include: {
          seats: {
            include: {
              showtimeSeat: true,
              ticket: true,
            },
          },
        },
      },
    },
  });

  if (!existingPayment) {
    logger.warn({ txnRef, provider }, '[settlePayment] Payment record not found by txnRef');
    return { settled: false, reason: 'PAYMENT_NOT_FOUND' };
  }

  // Idempotency: if already SUCCESS, no-op
  if (existingPayment.status === 'SUCCESS') {
    logger.info(
      { txnRef, paymentId: existingPayment.id },
      '[settlePayment] Payment already SUCCESS. Idempotent return.',
    );
    return { settled: true, payment: existingPayment, booking: existingPayment.booking };
  }

  if (!isSuccess) {
    const updatedPayment = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: 'FAILED',
        failureCode: failureCode || 'GATEWAY_FAILED',
        rawResponse: rawResponse ? JSON.parse(JSON.stringify(rawResponse)) : undefined,
      },
    });
    return { settled: true, payment: updatedPayment, booking: existingPayment.booking };
  }

  // Success flow: execute atomic transaction
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock payment record & enforce single successful payment per booking via successLock
      const updatedPayment = await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'SUCCESS',
          paidAt: new Date(),
          providerTxnNo: providerTxnNo || null,
          bankCode: bankCode || null,
          successLock: existingPayment.bookingId,
          rawResponse: rawResponse ? JSON.parse(JSON.stringify(rawResponse)) : undefined,
        },
      });

      // 2. Confirm booking
      const updatedBooking = await tx.booking.update({
        where: { id: existingPayment.bookingId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      // 3. Mark ShowtimeSeats as SOLD
      const showtimeSeatIds = existingPayment.booking.seats
        .map((bs) => bs.showtimeSeatId)
        .filter(Boolean);

      if (showtimeSeatIds.length > 0) {
        await tx.showtimeSeat.updateMany({
          where: { id: { in: showtimeSeatIds } },
          data: {
            status: 'SOLD',
            heldUntil: null,
          },
        });
      }

      // 4. Create Tickets for seats that don't have one yet
      const ticketsToCreate = [];
      for (const bs of existingPayment.booking.seats) {
        if (!bs.ticket) {
          ticketsToCreate.push({
            bookingId: existingPayment.bookingId,
            bookingSeatId: bs.id,
            qrVersion: 1,
            status: 'VALID',
            issuedAt: new Date(),
          });
        }
      }

      if (ticketsToCreate.length > 0) {
        await tx.ticket.createMany({
          data: ticketsToCreate,
        });
      }

      // Re-fetch tickets to sign QR codes if needed
      const tickets = await tx.ticket.findMany({
        where: { bookingId: existingPayment.bookingId },
      });

      return {
        payment: updatedPayment,
        booking: updatedBooking,
        tickets: tickets.map((t) => ({
          ...t,
          qrCode: buildQr(t.id, t.qrVersion),
        })),
      };
    });

    logger.info(
      { txnRef, paymentId: result.payment.id, bookingId: result.booking.id },
      '[settlePayment] Successfully settled payment and issued tickets',
    );

    // Dispatch confirmation email via SMTP/Mailpit asynchronously
    sendBookingConfirmationEmail({
      to: existingPayment.booking.contactEmail || 'customer@cinehub.vn',
      bookingCode: result.booking.code,
      movieTitle: 'Vé xem phim CineHub',
      cinemaName: 'CineHub Cinema',
      auditoriumName: 'Phòng chiếu',
      showtime: new Date().toLocaleString('vi-VN'),
      seats: existingPayment.booking.seats.map((s) => s.seatLabel),
      totalAmount: result.booking.totalAmount,
      tickets: result.tickets.map((t) => ({
        ticketId: t.id,
        seatLabel:
          existingPayment.booking.seats.find((s) => s.id === t.bookingSeatId)?.seatLabel || '',
        qrCode: t.qrCode,
      })),
    }).catch((err) => {
      logger.warn({ err: err.message }, '[settlePayment] Failed to send confirmation email');
    });

    return { settled: true, ...result };
  } catch (error) {
    if (error.code === 'P2002' && error.meta?.target?.includes('successLock')) {
      logger.warn(
        { txnRef, bookingId: existingPayment.bookingId },
        '[settlePayment] Conflict: Booking already has a settled SUCCESS payment',
      );
      return { settled: false, reason: 'BOOKING_ALREADY_SETTLED' };
    }
    logger.error({ err: error, txnRef }, '[settlePayment] Transaction failed');
    throw error;
  }
}
