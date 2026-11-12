import crypto from 'node:crypto';
import { MAX_SEATS_PER_BOOKING, SEAT_HOLD_SECONDS } from '@cinehub/contracts';
import { prisma } from '@cinehub/db';
import { AppError } from '../../platform/utils/errors.js';
import * as bookingRepository from './booking.repository.js';
import {
  acquireSeatLeases,
  releaseSeatLeases,
  getActiveSeatLeases,
} from '../../platform/cache/seat-lease.js';
import { momoAdapter } from '../../integrations/payments/momo.adapter.js';
import { settlePayment } from '../../integrations/payments/settle-payment.js';
import { buildQr } from '../../platform/utils/qr.js';
import { logger } from '../../platform/observability/logger.js';

export const BOOKING_MODULE_STATUS = 'ready';

/**
 * Get the real-time seat map of a showtime, merging DB state with Redis hold state.
 */
export async function getShowtimeSeats(showtimeId, userId) {
  const seats = await bookingRepository.findShowtimeSeats(showtimeId);
  if (!seats || seats.length === 0) {
    return [];
  }

  const seatIds = seats.map((s) => s.seatId);
  const activeLeases = await getActiveSeatLeases(showtimeId, seatIds);

  return seats.map((record) => {
    let effectiveStatus = record.status;
    let isHeldByMe = false;

    if (record.status === 'AVAILABLE') {
      const lease = activeLeases.get(record.seatId);
      if (lease) {
        effectiveStatus = 'HELD';
        if (userId && lease.userId === userId) {
          isHeldByMe = true;
        }
      }
    }

    return {
      id: record.id,
      seatId: record.seatId,
      label: record.seat.label,
      rowLabel: record.seat.rowLabel,
      colNumber: record.seat.colNumber,
      posX: record.seat.posX,
      posY: record.seat.posY,
      seatType: record.seat.seatType,
      status: effectiveStatus,
      isHeldByMe,
    };
  });
}

/**
 * Atomically acquire hold on a list of seats for a user.
 */
export async function createSeatHold({ showtimeId, seatIds, userId }) {
  if (!seatIds || seatIds.length === 0) {
    throw new AppError(400, 'BAD_REQUEST', 'Vui lòng chọn ít nhất 1 ghế');
  }

  if (seatIds.length > MAX_SEATS_PER_BOOKING) {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `Chỉ được giữ tối đa ${MAX_SEATS_PER_BOOKING} ghế mỗi lần`,
    );
  }

  await bookingRepository.lazyInitShowtimeSeats(showtimeId);

  const unavailableDbSeats = await bookingRepository.findUnavailableDbSeats(showtimeId, seatIds);
  if (unavailableDbSeats.length > 0) {
    throw new AppError(409, 'SEAT_TAKEN', 'Một hoặc nhiều ghế đã được bán hoặc bị khóa', {
      conflicts: unavailableDbSeats.map((s) => s.seatId),
    });
  }

  const leaseResult = await acquireSeatLeases({
    showtimeId,
    seatIds,
    userId,
  });

  if (!leaseResult.success) {
    throw new AppError(409, 'SEAT_TAKEN', 'Một hoặc nhiều ghế đang được người khác giữ', {
      conflicts: leaseResult.conflicts,
    });
  }

  return {
    holdToken: leaseResult.holdToken,
    expiresAt: leaseResult.expiresAt,
    seatIds,
  };
}

/**
 * Release seat holds held by a user.
 */
export async function releaseSeatHold({ showtimeId, seatIds, userId }) {
  const releasedCount = await releaseSeatLeases({
    showtimeId,
    seatIds,
    userId,
  });

  return { releasedCount };
}

/**
 * Helper to generate random booking code: CH + YYMMDD + 6 hex chars
 */
function generateBookingCode() {
  const d = new Date();
  const yymmdd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CH${yymmdd}${rand}`;
}

/**
 * Create a new pending Booking from selected seats & concessions.
 */
export async function createBooking({
  userId,
  showtimeId,
  seatIds,
  concessions = [],
  voucherCode: _voucherCode,
  contactEmail,
  contactPhone,
}) {
  if (!seatIds || seatIds.length === 0) {
    throw new AppError(400, 'BAD_REQUEST', 'Vui lòng chọn ít nhất 1 ghế');
  }

  // 1. Verify user holds these seats in Redis
  const activeLeases = await getActiveSeatLeases(showtimeId, seatIds);
  for (const sId of seatIds) {
    const lease = activeLeases.get(sId);
    if (!lease || lease.userId !== userId) {
      throw new AppError(
        409,
        'SEAT_HOLD_EXPIRED',
        'Phiên giữ chỗ của bạn đã hết hạn hoặc không hợp lệ. Vui lòng chọn lại ghế.',
      );
    }
  }

  // 2. Fetch ShowtimeSeats from DB
  const showtimeSeats = await prisma.showtimeSeat.findMany({
    where: {
      showtimeId,
      seatId: { in: seatIds },
    },
    include: {
      seat: {
        include: {
          seatType: true,
        },
      },
    },
  });

  if (showtimeSeats.length !== seatIds.length) {
    throw new AppError(400, 'BAD_REQUEST', 'Một số ghế không tồn tại trong suất chiếu này');
  }

  const defaultTicketType = await bookingRepository.findDefaultTicketType();

  // 3. Calculate seat prices (Standard: 90.000, VIP: 110.000, Sweetbox: 160.000)
  let seatSubtotal = 0;
  const seatsData = showtimeSeats.map((stSeat) => {
    let price = 90000;
    const typeCode = stSeat.seat.seatType?.code?.toUpperCase() || 'STANDARD';
    if (typeCode.includes('VIP')) price = 110000;
    else if (typeCode.includes('SWEET') || typeCode.includes('COUPLE')) price = 160000;

    seatSubtotal += price;

    return {
      showtimeSeatId: stSeat.id,
      seatLabel: stSeat.seat.label,
      seatTypeCode: typeCode,
      ticketTypeId: defaultTicketType.id,
      ticketTypeCode: defaultTicketType.code,
      price,
      activeLock: stSeat.id, // Enforce single active booking per seat
    };
  });

  // 4. Calculate concessions subtotal
  let concessionsSubtotal = 0;
  const concessionsData = [];
  if (concessions && concessions.length > 0) {
    const concessionIds = concessions.map((c) => c.concessionId);
    const dbConcessions = await bookingRepository.findConcessionsByIds(concessionIds);
    const concessionMap = new Map(dbConcessions.map((c) => [c.id, c]));

    for (const item of concessions) {
      const dbC = concessionMap.get(item.concessionId);
      if (dbC && item.quantity > 0) {
        const itemTotal = dbC.price * item.quantity;
        concessionsSubtotal += itemTotal;
        concessionsData.push({
          concessionId: dbC.id,
          nameSnapshot: dbC.name,
          quantity: item.quantity,
          unitPrice: dbC.price,
        });
      }
    }
  }

  const subtotalAmount = seatSubtotal + concessionsSubtotal;
  const discountAmount = 0;
  const serviceFee = 0;
  const totalAmount = subtotalAmount + serviceFee - discountAmount;

  const expiresAt = new Date(Date.now() + SEAT_HOLD_SECONDS * 1000);

  const booking = await bookingRepository.createBookingWithSeats({
    bookingData: {
      code: generateBookingCode(),
      userId,
      showtimeId,
      status: 'PENDING',
      subtotalAmount,
      discountAmount,
      serviceFee,
      totalAmount,
      contactEmail: contactEmail || 'customer@cinehub.vn',
      contactPhone: contactPhone || null,
      expiresAt,
    },
    seatsData,
    concessionsData,
    showtimeSeatIds: showtimeSeats.map((s) => s.id),
  });

  return booking;
}

/**
 * Initiate payment for a pending booking.
 */
export async function initiatePayment({
  bookingId,
  provider = 'MOMO',
  userId,
  clientIp: _clientIp,
}) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy thông tin đơn đặt vé');
  }

  if (booking.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thanh toán đơn hàng này');
  }

  if (booking.status !== 'PENDING') {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `Đơn hàng ở trạng thái ${booking.status}, không thể thanh toán`,
    );
  }

  if (new Date() > booking.expiresAt) {
    throw new AppError(400, 'BOOKING_EXPIRED', 'Đơn hàng đã hết thời gian giữ chỗ');
  }

  // Create Payment record
  const txnRef = `CH_${booking.code}_${Date.now()}`;
  const payment = await prisma.payment.create({
    data: {
      bookingId: booking.id,
      provider: provider.toUpperCase(),
      amount: booking.totalAmount,
      txnRef,
      status: 'INITIATED',
    },
  });

  // Call provider adapter
  let paymentResult;
  if (provider.toUpperCase() === 'MOMO') {
    paymentResult = await momoAdapter.createPaymentUrl({ booking, payment });
  } else {
    throw new AppError(
      400,
      'BAD_REQUEST',
      `Cổng thanh toán ${provider} chưa được khởi tạo ở pha này`,
    );
  }

  // Update payment status to PENDING
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'PENDING',
      rawResponse: paymentResult.raw ? JSON.parse(JSON.stringify(paymentResult.raw)) : undefined,
    },
  });

  return {
    paymentId: payment.id,
    txnRef,
    payUrl: paymentResult.payUrl,
    qrData: paymentResult.qrData,
    qrCodeUrl: paymentResult.qrCodeUrl,
    deeplink: paymentResult.deeplink,
  };
}

/**
 * Actively refresh and reconcile payment status for a booking.
 */
export async function refreshBookingPayment({ bookingId, userId }) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, 'NOT_FOUND', 'Đơn hàng không tồn tại');
  }

  if (booking.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Không có quyền truy cập');
  }

  if (booking.status === 'CONFIRMED') {
    return getBookingDetails(bookingId, userId);
  }

  const latestPayment = booking.payments[0];
  if (
    latestPayment &&
    (latestPayment.status === 'PENDING' || latestPayment.status === 'INITIATED')
  ) {
    if (latestPayment.provider === 'MOMO') {
      try {
        const queryRes = await momoAdapter.queryTransaction({ txnRef: latestPayment.txnRef });
        if (queryRes && queryRes.isSuccess) {
          await settlePayment({
            txnRef: latestPayment.txnRef,
            provider: 'MOMO',
            isSuccess: true,
            providerTxnNo: queryRes.providerTxnNo,
            bankCode: queryRes.bankCode,
            rawResponse: queryRes.raw,
          });
        }
      } catch (err) {
        logger.warn(
          { err: err.message, txnRef: latestPayment.txnRef },
          '[refreshBookingPayment] MoMo query failed',
        );
      }
    }
  }

  return getBookingDetails(bookingId, userId);
}

/**
 * Get comprehensive booking details including signed ticket QR codes.
 */
export async function getBookingDetails(bookingId, userId) {
  const booking = await bookingRepository.findBookingById(bookingId);
  if (!booking) {
    throw new AppError(404, 'NOT_FOUND', 'Đơn hàng không tồn tại');
  }

  if (booking.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'Không có quyền xem đơn hàng này');
  }

  const ticketsWithQr = (booking.tickets || []).map((t) => ({
    ...t,
    qrCode: buildQr(t.id, t.qrVersion),
  }));

  return {
    ...booking,
    tickets: ticketsWithQr,
  };
}
