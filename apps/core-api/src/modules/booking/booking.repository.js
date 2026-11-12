import { prisma } from '@cinehub/db';

/**
 * Ensure ShowtimeSeat records exist for a showtime (lazy initialization).
 * Copies all active Seats from the showtime's Auditorium into ShowtimeSeat.
 *
 * @param {string} showtimeId
 * @returns {Promise<number>} Number of newly initialized seats
 */
export async function lazyInitShowtimeSeats(showtimeId) {
  const showtime = await prisma.showtime.findUnique({
    where: { id: showtimeId },
    include: {
      auditorium: {
        include: {
          seats: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  if (!showtime) {
    return 0;
  }

  const existingSeats = await prisma.showtimeSeat.findMany({
    where: { showtimeId },
    select: { seatId: true },
  });

  const existingSeatIds = new Set(existingSeats.map((s) => s.seatId));
  const missingSeats = showtime.auditorium.seats.filter((s) => !existingSeatIds.has(s.id));

  if (missingSeats.length === 0) {
    return 0;
  }

  await prisma.showtimeSeat.createMany({
    data: missingSeats.map((seat) => ({
      showtimeId,
      seatId: seat.id,
      status: 'AVAILABLE',
      version: 0,
      isSeeded: false,
    })),
    skipDuplicates: true,
  });

  return missingSeats.length;
}

/**
 * Query all ShowtimeSeat records for a given showtime along with seat metadata.
 *
 * @param {string} showtimeId
 * @returns {Promise<any[]>}
 */
export async function findShowtimeSeats(showtimeId) {
  await lazyInitShowtimeSeats(showtimeId);

  return prisma.showtimeSeat.findMany({
    where: { showtimeId },
    include: {
      seat: {
        include: {
          seatType: true,
        },
      },
    },
    orderBy: [{ seat: { rowLabel: 'asc' } }, { seat: { colNumber: 'asc' } }],
  });
}

/**
 * Check if any of the requested seats are permanently unavailable (SOLD or BLOCKED) in DB.
 *
 * @param {string} showtimeId
 * @param {string[]} seatIds
 * @returns {Promise<{ seatId: string, status: string }[]>}
 */
export async function findUnavailableDbSeats(showtimeId, seatIds) {
  const records = await prisma.showtimeSeat.findMany({
    where: {
      showtimeId,
      seatId: { in: seatIds },
      status: { in: ['SOLD', 'BLOCKED'] },
    },
    select: {
      seatId: true,
      status: true,
    },
  });

  return records;
}
