import 'dotenv/config';
import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@cinehub/db';
import { getRedisClient, closeRedis } from '../src/platform/cache/redis.js';
import * as bookingService from '../src/modules/booking/booking.service.js';
import { settlePayment } from '../src/integrations/payments/settle-payment.js';
import { simulatePaymentSuccess } from '../src/integrations/payments/simulate.js';
import { verifyQr } from '../src/platform/utils/qr.js';

describe('Seat Hold & Concurrency Tests (Phase B & C)', () => {
  let redis;
  let testAuditorium;
  let testMovie;
  let testShowtime;
  let seatType;
  const seats = [];
  const userA = 'user-test-concurrent-aaa-001';
  const userB = 'user-test-concurrent-bbb-002';

  beforeAll(async () => {
    redis = getRedisClient();
    if (redis.status === 'wait') {
      await redis.connect();
    }

    // 1. Prepare test seat type
    seatType =
      (await prisma.seatType.findFirst()) ||
      (await prisma.seatType.create({
        data: {
          code: `STANDARD_TEST_${Date.now()}`,
          name: 'Standard Seat Test',
          capacity: 1,
        },
      }));

    // 2. Find or prepare Cinema
    const existingCinema = await prisma.cinema.findFirst();
    if (!existingCinema) {
      throw new Error('No existing Cinema found in database. Please run seed.');
    }

    testAuditorium = await prisma.auditorium.create({
      data: {
        cinemaId: existingCinema.id,
        name: `Auditorium Test ${Date.now()}`,
        totalSeats: 10,
        totalCapacity: 10,
      },
    });

    testMovie =
      (await prisma.movie.findFirst()) ||
      (await prisma.movie.create({
        data: {
          title: 'Concurrency Test Movie',
          slug: `concurrency-test-movie-${Date.now()}`,
          status: 'NOW_SHOWING',
          duration: 120,
          ageRating: 'P',
          posterUrl: 'https://example.com/poster.jpg',
        },
      }));

    const dedup = crypto.createHash('sha1').update(`dedup-test-${Date.now()}`).digest('hex');
    testShowtime = await prisma.showtime.create({
      data: {
        movieId: testMovie.id,
        auditoriumId: testAuditorium.id,
        cinemaId: existingCinema.id,
        dedupKey: dedup,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 86400000 + 7200000),
        localDate: new Date('2026-11-13'),
      },
    });

    // 3. Create 10 seats (A1 to A10) in Auditorium
    for (let i = 1; i <= 10; i++) {
      const s = await prisma.seat.create({
        data: {
          auditoriumId: testAuditorium.id,
          seatTypeId: seatType.id,
          rowLabel: 'A',
          colNumber: i,
          label: `A${i}`,
          posX: i * 20,
          posY: 50,
          isActive: true,
        },
      });
      seats.push(s);
    }
  });

  afterAll(async () => {
    // Cleanup Redis keys
    if (testShowtime) {
      const keys = await redis.keys(`*{${testShowtime.id}}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }

    // Cleanup DB in reverse cascade order
    if (testShowtime) {
      await prisma.ticket.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.payment.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.bookingSeat.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.booking.deleteMany({ where: { showtimeId: testShowtime.id } });
      await prisma.showtimeSeat.deleteMany({ where: { showtimeId: testShowtime.id } });
      await prisma.seat.deleteMany({ where: { auditoriumId: testAuditorium.id } });
      await prisma.showtime.delete({ where: { id: testShowtime.id } });
      await prisma.auditorium.delete({ where: { id: testAuditorium.id } });
    }

    await prisma.$disconnect();
    await closeRedis();
  });

  it('Test 1: Lazy-initializes seats and returns real-time seat status', async () => {
    const seatMap = await bookingService.getShowtimeSeats(testShowtime.id, userA);
    expect(seatMap.length).toBe(10);
    expect(seatMap.every((s) => s.status === 'AVAILABLE')).toBe(true);
  });

  it('Test 2: User A holds seats A1, A2 successfully', async () => {
    const result = await bookingService.createSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [seats[0].id, seats[1].id],
      userId: userA,
    });

    expect(result.holdToken).toBeDefined();
    expect(result.seatIds).toEqual([seats[0].id, seats[1].id]);

    const seatMap = await bookingService.getShowtimeSeats(testShowtime.id, userA);
    const a1 = seatMap.find((s) => s.seatId === seats[0].id);
    const a2 = seatMap.find((s) => s.seatId === seats[1].id);
    const a3 = seatMap.find((s) => s.seatId === seats[2].id);

    expect(a1.status).toBe('HELD');
    expect(a1.isHeldByMe).toBe(true);
    expect(a2.status).toBe('HELD');
    expect(a3.status).toBe('AVAILABLE');

    // For User B, seats are HELD but isHeldByMe is false
    const seatMapB = await bookingService.getShowtimeSeats(testShowtime.id, userB);
    const a1ForB = seatMapB.find((s) => s.seatId === seats[0].id);
    expect(a1ForB.status).toBe('HELD');
    expect(a1ForB.isHeldByMe).toBe(false);
  });

  it('Test 3: CONCURRENCY RACE CONDITION - User A and User B race for seat A5 simultaneously', async () => {
    const targetSeatId = seats[4].id; // Seat A5

    // Run simultaneously
    const results = await Promise.allSettled([
      bookingService.createSeatHold({
        showtimeId: testShowtime.id,
        seatIds: [targetSeatId],
        userId: userA,
      }),
      bookingService.createSeatHold({
        showtimeId: testShowtime.id,
        seatIds: [targetSeatId],
        userId: userB,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly ONE user must succeed
    expect(fulfilled.length).toBe(1);
    // The other user must receive SEAT_TAKEN error
    expect(rejected.length).toBe(1);
    expect(rejected[0].reason.code).toBe('SEAT_TAKEN');
  });

  it('Test 4: ATOMICITY (ALL-OR-NOTHING) - User B requests [A1, A6] where A1 is already held', async () => {
    // A1 is held by userA, A6 is free
    await expect(
      bookingService.createSeatHold({
        showtimeId: testShowtime.id,
        seatIds: [seats[0].id, seats[5].id],
        userId: userB,
      }),
    ).rejects.toMatchObject({
      code: 'SEAT_TAKEN',
    });

    // Verify A6 is STILL FREE (not locked)
    const seatMap = await bookingService.getShowtimeSeats(testShowtime.id, userA);
    const a6 = seatMap.find((s) => s.seatId === seats[5].id);
    expect(a6.status).toBe('AVAILABLE');
  });

  it('Test 5: Seat Release allows immediate re-acquisition', async () => {
    // User A releases seat A1
    const releaseRes = await bookingService.releaseSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [seats[0].id],
      userId: userA,
    });
    expect(releaseRes.releasedCount).toBe(1);

    // User B can now acquire A1 immediately
    const acquireRes = await bookingService.createSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [seats[0].id],
      userId: userB,
    });
    expect(acquireRes.holdToken).toBeDefined();

    // Verify A1 is now held by User B
    const seatMap = await bookingService.getShowtimeSeats(testShowtime.id, userB);
    const a1 = seatMap.find((s) => s.seatId === seats[0].id);
    expect(a1.status).toBe('HELD');
    expect(a1.isHeldByMe).toBe(true);
  });

  it('Test 6: Idempotent settlePayment and ticket issuance with QR HMAC verification', async () => {
    const existingUser = await prisma.user.findFirst();

    // 1. Create a test booking
    const showtimeSeat = await prisma.showtimeSeat.findFirst({
      where: { showtimeId: testShowtime.id, seatId: seats[8].id },
    });

    const ticketType =
      (await prisma.ticketType.findFirst()) ||
      (await prisma.ticketType.create({
        data: { code: `ADULT_${Date.now()}`, name: 'Adult' },
      }));

    const testBooking = await prisma.booking.create({
      data: {
        code: `CH${Date.now()}`,
        userId: existingUser.id,
        showtimeId: testShowtime.id,
        status: 'PENDING',
        totalAmount: 100000,
        contactEmail: 'userA@example.com',
        expiresAt: new Date(Date.now() + 900000),
        seats: {
          create: [
            {
              showtimeSeatId: showtimeSeat.id,
              seatLabel: 'A9',
              seatTypeCode: 'STANDARD',
              ticketTypeId: ticketType.id,
              ticketTypeCode: ticketType.code,
              price: 100000,
            },
          ],
        },
      },
    });

    const txnRef = `TXN_TEST_${Date.now()}`;
    const testPayment = await prisma.payment.create({
      data: {
        bookingId: testBooking.id,
        provider: 'MOMO',
        amount: 100000,
        txnRef,
        status: 'INITIATED',
      },
    });

    // 2. Settle payment successfully
    const settleRes = await settlePayment({
      txnRef,
      provider: 'MOMO',
      isSuccess: true,
      providerTxnNo: 'MOMO_123456',
      bankCode: 'MOMO_WALLET',
    });

    expect(settleRes.settled).toBe(true);
    expect(settleRes.payment.status).toBe('SUCCESS');
    expect(settleRes.booking.status).toBe('CONFIRMED');
    expect(settleRes.tickets.length).toBe(1);

    const ticket = settleRes.tickets[0];
    expect(ticket.qrCode).toBeDefined();

    // Verify QR HMAC signature
    const verifiedTicketId = verifyQr(ticket.qrCode, ticket.qrVersion);
    expect(verifiedTicketId).toBe(ticket.id);

    // 3. Test IDEMPOTENCY: calling settlePayment again with same txnRef returns same result
    const secondSettle = await settlePayment({
      txnRef,
      provider: 'MOMO',
      isSuccess: true,
      providerTxnNo: 'MOMO_123456',
    });
    expect(secondSettle.settled).toBe(true);
    expect(secondSettle.payment.status).toBe('SUCCESS');

    // 4. Test Simulation endpoint
    const simRes = await simulatePaymentSuccess(testPayment.id);
    expect(simRes.settled).toBe(true);
  });
});
