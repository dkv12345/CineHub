import { MAX_SEATS_PER_BOOKING } from '@cinehub/contracts';
import { AppError } from '../../platform/utils/errors.js';
import * as bookingRepository from './booking.repository.js';
import {
  acquireSeatLeases,
  releaseSeatLeases,
  getActiveSeatLeases,
} from '../../platform/cache/seat-lease.js';

export const BOOKING_MODULE_STATUS = 'ready';

/**
 * Get the real-time seat map of a showtime, merging DB state with Redis hold state.
 *
 * @param {string} showtimeId
 * @param {string} [userId]
 * @returns {Promise<any[]>}
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
 *
 * @param {Object} params
 * @param {string} params.showtimeId
 * @param {string[]} params.seatIds
 * @param {string} params.userId
 * @returns {Promise<{ holdToken: string, expiresAt: Date, seatIds: string[] }>}
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

  // 1. Ensure seats exist in DB
  await bookingRepository.lazyInitShowtimeSeats(showtimeId);

  // 2. Check if any seat is already SOLD or BLOCKED in DB
  const unavailableDbSeats = await bookingRepository.findUnavailableDbSeats(showtimeId, seatIds);
  if (unavailableDbSeats.length > 0) {
    throw new AppError(409, 'SEAT_TAKEN', 'Một hoặc nhiều ghế đã được bán hoặc bị khóa', {
      conflicts: unavailableDbSeats.map((s) => s.seatId),
    });
  }

  // 3. Atomic Redis hold via Lua script
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
 *
 * @param {Object} params
 * @param {string} params.showtimeId
 * @param {string[]} params.seatIds
 * @param {string} params.userId
 * @returns {Promise<{ releasedCount: number }>}
 */
export async function releaseSeatHold({ showtimeId, seatIds, userId }) {
  const releasedCount = await releaseSeatLeases({
    showtimeId,
    seatIds,
    userId,
  });

  return { releasedCount };
}
