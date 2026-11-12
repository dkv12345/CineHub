import 'dotenv/config';
import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@cinehub/db';
import { cleanExpiredBookingsAndHolds } from '../src/jobs/cleanup-expired.js';

describe('Expired Holds & Bookings Cleanup Job Tests (Phase I)', () => {
  let testAuditorium;
  let testShowtime;
  let testSeat;
  let testUser;

  beforeAll(async () => {
    testUser = await prisma.user.findFirst();
    const cinema = await prisma.cinema.findFirst();
    const movie = await prisma.movie.findFirst();
    const seatType = await prisma.seatType.findFirst();

    testAuditorium = await prisma.auditorium.create({
      data: {
        cinemaId: cinema.id,
        name: `Auditorium Cleanup ${Date.now()}`,
        totalSeats: 1,
        totalCapacity: 1,
      },
    });

    const dedup = crypto.createHash('sha1').update(`cleanup-dedup-${Date.now()}`).digest('hex');
    testShowtime = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        auditoriumId: testAuditorium.id,
        cinemaId: cinema.id,
        dedupKey: dedup,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 86400000 + 7200000),
        localDate: new Date('2026-11-13'),
      },
    });

    testSeat = await prisma.seat.create({
      data: {
        auditoriumId: testAuditorium.id,
        seatTypeId: seatType.id,
        rowLabel: 'X',
        colNumber: 1,
        label: 'X1',
        posX: 20,
        posY: 50,
      },
    });
  });

  afterAll(async () => {
    if (testShowtime) {
      await prisma.bookingSeat.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.showtimeSeat.deleteMany({ where: { showtimeId: testShowtime.id } });
      await prisma.booking.deleteMany({ where: { showtimeId: testShowtime.id } });
      await prisma.seat.deleteMany({ where: { auditoriumId: testAuditorium.id } });
      await prisma.showtime.delete({ where: { id: testShowtime.id } });
      await prisma.auditorium.delete({ where: { id: testAuditorium.id } });
    }
    await prisma.$disconnect();
  });

  it('detects and cleans up expired bookings and releases seat locks', async () => {
    const showtimeSeat = await prisma.showtimeSeat.create({
      data: {
        showtimeId: testShowtime.id,
        seatId: testSeat.id,
        status: 'AVAILABLE',
        heldUntil: new Date(Date.now() - 60000), // Expired 1 min ago
      },
    });

    const ticketType = await prisma.ticketType.findFirst();

    // Create booking that expired 5 minutes ago
    const expiredBooking = await prisma.booking.create({
      data: {
        code: `CH_EXP_${Date.now()}`,
        userId: testUser.id,
        showtimeId: testShowtime.id,
        status: 'PENDING',
        totalAmount: 90000,
        contactEmail: 'expired@cinehub.vn',
        expiresAt: new Date(Date.now() - 300000),
        seats: {
          create: [
            {
              showtimeSeatId: showtimeSeat.id,
              seatLabel: 'X1',
              seatTypeCode: 'STANDARD',
              ticketTypeId: ticketType.id,
              ticketTypeCode: ticketType.code,
              price: 90000,
              activeLock: showtimeSeat.id,
            },
          ],
        },
      },
      include: {
        seats: true,
      },
    });

    await prisma.showtimeSeat.update({
      where: { id: showtimeSeat.id },
      data: {
        heldByBookingId: expiredBooking.id,
        heldUntil: expiredBooking.expiresAt,
      },
    });

    // Run cleanup
    const result = await cleanExpiredBookingsAndHolds();
    expect(result.expiredBookingsCount).toBeGreaterThanOrEqual(1);

    // Verify booking is marked EXPIRED
    const dbBooking = await prisma.booking.findUnique({ where: { id: expiredBooking.id } });
    expect(dbBooking.status).toBe('EXPIRED');
    expect(dbBooking.cancelReason).toBe('BOOKING_EXPIRED_TIMEOUT');

    // Verify seat activeLock is released
    const dbBookingSeat = await prisma.bookingSeat.findFirst({
      where: { bookingId: expiredBooking.id },
    });
    expect(dbBookingSeat.activeLock).toBeNull();

    // Verify ShowtimeSeat hold is released
    const dbShowtimeSeat = await prisma.showtimeSeat.findUnique({ where: { id: showtimeSeat.id } });
    expect(dbShowtimeSeat.heldByBookingId).toBeNull();
    expect(dbShowtimeSeat.heldUntil).toBeNull();
  });
});
