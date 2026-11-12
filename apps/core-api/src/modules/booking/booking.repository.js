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

/**
 * Find default ticket type (e.g. ADULT).
 */
export async function findDefaultTicketType() {
  let tt = await prisma.ticketType.findFirst({
    where: { isActive: true },
  });
  if (!tt) {
    tt = await prisma.ticketType.create({
      data: { code: 'ADULT', name: 'Adult Standard' },
    });
  }
  return tt;
}

/**
 * Find Concessions by IDs.
 */
export async function findConcessionsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  return prisma.concession.findMany({
    where: { id: { in: ids } },
  });
}

/**
 * Create a new booking transactionally.
 */
export async function createBookingWithSeats({
  bookingData,
  seatsData,
  concessionsData = [],
  showtimeSeatIds = [],
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Create Booking
    const booking = await tx.booking.create({
      data: {
        ...bookingData,
        seats: {
          create: seatsData,
        },
        concessions:
          concessionsData.length > 0
            ? {
                create: concessionsData,
              }
            : undefined,
      },
      include: {
        seats: {
          include: {
            showtimeSeat: {
              include: {
                seat: true,
              },
            },
          },
        },
        concessions: true,
      },
    });

    // 2. Associate showtime seats with booking
    if (showtimeSeatIds.length > 0) {
      await tx.showtimeSeat.updateMany({
        where: { id: { in: showtimeSeatIds } },
        data: {
          heldByBookingId: booking.id,
          heldUntil: booking.expiresAt,
        },
      });
    }

    return booking;
  });
}

/**
 * Find full booking details by ID.
 */
export async function findBookingById(id) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      showtime: {
        include: {
          movie: true,
          cinema: true,
          auditorium: true,
        },
      },
      seats: {
        include: {
          showtimeSeat: {
            include: {
              seat: {
                include: {
                  seatType: true,
                },
              },
            },
          },
          ticket: true,
        },
      },
      concessions: true,
      payments: {
        orderBy: { createdAt: 'desc' },
      },
      tickets: true,
    },
  });
}
