import { prisma } from '@cinehub/db';
import { logger } from '../platform/observability/logger.js';

/**
 * Clean up expired seat holds and bookings.
 * Releases locks so seats become available for other customers.
 */
export async function cleanExpiredBookingsAndHolds() {
  const now = new Date();

  try {
    // 1. Expire pending bookings that passed expiresAt
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      select: {
        id: true,
        code: true,
      },
      take: 100,
    });

    if (expiredBookings.length > 0) {
      const bookingIds = expiredBookings.map((b) => b.id);
      logger.info({ count: bookingIds.length }, '[Cleanup Job] Found expired bookings');

      await prisma.$transaction(async (tx) => {
        // Mark booking as EXPIRED
        await tx.booking.updateMany({
          where: { id: { in: bookingIds } },
          data: {
            status: 'EXPIRED',
            cancelledAt: now,
            cancelReason: 'BOOKING_EXPIRED_TIMEOUT',
          },
        });

        // Release activeLock on BookingSeats
        await tx.bookingSeat.updateMany({
          where: { bookingId: { in: bookingIds } },
          data: {
            activeLock: null,
          },
        });

        // Release ShowtimeSeats
        await tx.showtimeSeat.updateMany({
          where: { heldByBookingId: { in: bookingIds } },
          data: {
            heldByBookingId: null,
            heldUntil: null,
          },
        });

        // Mark associated pending payments as FAILED
        await tx.payment.updateMany({
          where: {
            bookingId: { in: bookingIds },
            status: { in: ['INITIATED', 'PENDING'] },
          },
          data: {
            status: 'FAILED',
            failureCode: 'BOOKING_EXPIRED',
          },
        });
      });
    }

    // 2. Clear orphaned ShowtimeSeats whose heldUntil has expired
    const orphanedSeats = await prisma.showtimeSeat.updateMany({
      where: {
        status: 'AVAILABLE',
        heldUntil: { lt: now },
        heldByBookingId: null,
      },
      data: {
        heldUntil: null,
      },
    });

    if (orphanedSeats.count > 0) {
      logger.info(
        { count: orphanedSeats.count },
        '[Cleanup Job] Cleared expired seat hold records',
      );
    }

    return {
      expiredBookingsCount: expiredBookings.length,
      orphanedSeatsCount: orphanedSeats.count,
    };
  } catch (error) {
    logger.error({ err: error.message }, '[Cleanup Job] Error cleaning expired bookings and holds');
    throw error;
  }
}
