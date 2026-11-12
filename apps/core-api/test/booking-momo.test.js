import 'dotenv/config';
import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@cinehub/db';
import { createApp } from '../src/bootstrap/app.js';
import { getRedisClient, closeRedis } from '../src/platform/cache/redis.js';
import * as bookingService from '../src/modules/booking/booking.service.js';
import { env } from '../src/platform/config/env.js';
import { generateAccessToken } from '../src/platform/security/jwt.js';
import { verifyQr } from '../src/platform/utils/qr.js';

describe('Booking & MoMo 3-Way Reconciliation Tests (Phase D)', () => {
  let app;
  let redis;
  let testUser;
  let userToken;
  let testAuditorium;
  let testMovie;
  let testShowtime;
  const testSeats = [];

  beforeAll(async () => {
    app = createApp();
    redis = getRedisClient();
    if (redis.status === 'wait') {
      await redis.connect();
    }

    testUser = await prisma.user.findFirst();
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: `momo-test-${Date.now()}@cinehub.vn`,
          fullName: 'MoMo Test User',
          role: 'CUSTOMER',
        },
      });
    }

    userToken = generateAccessToken({
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });

    const cinema = await prisma.cinema.findFirst();
    const seatType = await prisma.seatType.findFirst();

    testAuditorium = await prisma.auditorium.create({
      data: {
        cinemaId: cinema.id,
        name: `Auditorium MoMo ${Date.now()}`,
        totalSeats: 5,
        totalCapacity: 5,
      },
    });

    testMovie =
      (await prisma.movie.findFirst()) ||
      (await prisma.movie.create({
        data: {
          title: 'MoMo Integration Movie',
          slug: `momo-movie-${Date.now()}`,
          status: 'NOW_SHOWING',
          duration: 120,
          ageRating: 'P',
        },
      }));

    const dedup = crypto.createHash('sha1').update(`momo-dedup-${Date.now()}`).digest('hex');
    testShowtime = await prisma.showtime.create({
      data: {
        movieId: testMovie.id,
        auditoriumId: testAuditorium.id,
        cinemaId: cinema.id,
        dedupKey: dedup,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 86400000 + 7200000),
        localDate: new Date('2026-11-13'),
      },
    });

    for (let i = 1; i <= 5; i++) {
      const s = await prisma.seat.create({
        data: {
          auditoriumId: testAuditorium.id,
          seatTypeId: seatType.id,
          rowLabel: 'B',
          colNumber: i,
          label: `B${i}`,
          posX: i * 20,
          posY: 50,
          isActive: true,
        },
      });
      testSeats.push(s);
    }
  });

  afterAll(async () => {
    if (testShowtime) {
      const keys = await redis.keys(`*{${testShowtime.id}}*`);
      if (keys.length > 0) await redis.del(...keys);

      await prisma.paymentWebhookEvent.deleteMany({ where: { txnRef: { contains: 'CH_' } } });
      await prisma.ticket.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.payment.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.bookingSeat.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.showtimeSeat.deleteMany({ where: { showtimeId: testShowtime.id } });
      await prisma.booking.deleteMany({ where: { showtimeId: testShowtime.id } });
      await prisma.seat.deleteMany({ where: { auditoriumId: testAuditorium.id } });
      await prisma.showtime.delete({ where: { id: testShowtime.id } });
      await prisma.auditorium.delete({ where: { id: testAuditorium.id } });
    }

    await prisma.$disconnect();
    await closeRedis();
  });

  it('1. Holds seats and creates a pending Booking via POST /api/v1/booking/checkout', async () => {
    // Hold seats B1 and B2
    const holdRes = await bookingService.createSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [testSeats[0].id, testSeats[1].id],
      userId: testUser.id,
    });
    expect(holdRes.holdToken).toBeDefined();

    // Checkout booking
    const res = await request(app)
      .post('/api/v1/booking/checkout')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        showtimeId: testShowtime.id,
        seatIds: [testSeats[0].id, testSeats[1].id],
        contactEmail: 'momo-user@cinehub.vn',
        contactPhone: '0901234567',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.seats.length).toBe(2);
    expect(res.body.data.totalAmount).toBeGreaterThan(0);
  });

  it('2. Initiates payment with MoMo Gateway and returns payUrl and qrData', async () => {
    // Hold and create booking
    await bookingService.createSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [testSeats[2].id],
      userId: testUser.id,
    });

    const booking = await bookingService.createBooking({
      userId: testUser.id,
      showtimeId: testShowtime.id,
      seatIds: [testSeats[2].id],
      contactEmail: 'test@cinehub.vn',
    });

    // Request MoMo payment initiation
    const res = await request(app)
      .post(`/api/v1/booking/${booking.id}/payments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'MOMO' });

    expect(res.status).toBe(200);
    expect(res.body.data.payUrl).toBeDefined();
    expect(res.body.data.qrData).toBeDefined();
    expect(res.body.data.txnRef).toBeDefined();

    // Verify Payment is PENDING in DB
    const payment = await prisma.payment.findUnique({
      where: { txnRef: res.body.data.txnRef },
    });
    expect(payment).toBeDefined();
    expect(payment.status).toBe('PENDING');
  });

  it('3. Reconciliation Path 1 (Real IPN): Valid signature settles payment and issues tickets', async () => {
    // Prepare a test payment
    await bookingService.createSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [testSeats[3].id],
      userId: testUser.id,
    });

    const booking = await bookingService.createBooking({
      userId: testUser.id,
      showtimeId: testShowtime.id,
      seatIds: [testSeats[3].id],
      contactEmail: 'ipn-test@cinehub.vn',
    });

    const txnRef = `CH_${booking.code}_IPN_${Date.now()}`;
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: 'MOMO',
        amount: booking.totalAmount,
        txnRef,
        status: 'PENDING',
      },
    });

    // Construct valid MoMo IPN payload with correct HMAC
    const partnerCode = env.MOMO_PARTNER_CODE;
    const accessKey = env.MOMO_ACCESS_KEY;
    const secretKey = env.MOMO_SECRET_KEY;
    const amount = booking.totalAmount.toString();
    const orderId = txnRef;
    const orderInfo = 'Pay CineHub Booking';
    const orderType = 'momo_wallet';
    const transId = Date.now().toString();
    const resultCode = 0;
    const message = 'Thành công.';
    const payType = 'qr';
    const responseTime = Date.now().toString();
    const extraData = '';
    const requestId = txnRef;

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&message=${message}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&orderType=${orderType}` +
      `&partnerCode=${partnerCode}` +
      `&payType=${payType}` +
      `&requestId=${requestId}` +
      `&responseTime=${responseTime}` +
      `&resultCode=${resultCode}` +
      `&transId=${transId}`;

    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const ipnPayload = {
      partnerCode,
      accessKey,
      orderId,
      requestId,
      amount: Number(amount),
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime: Number(responseTime),
      extraData,
      signature,
    };

    const res = await request(app).post('/api/v1/payments/momo-ipn').send(ipnPayload);

    expect(res.status).toBe(200);
    expect(res.body.resultCode).toBe(0);

    // Verify DB settled
    const updatedPayment = await prisma.payment.findUnique({ where: { txnRef } });
    expect(updatedPayment.status).toBe('SUCCESS');

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updatedBooking.status).toBe('CONFIRMED');

    // Verify tickets issued with valid QR
    const tickets = await prisma.ticket.findMany({ where: { bookingId: booking.id } });
    expect(tickets.length).toBe(1);
    expect(tickets[0].status).toBe('VALID');

    // Verify Webhook event was logged
    const event = await prisma.paymentWebhookEvent.findFirst({
      where: { txnRef },
    });
    expect(event).toBeDefined();
    expect(event.signatureValid).toBe(true);
  });

  it('4. Rejects MoMo IPN with forged/invalid signature (HTTP 400)', async () => {
    const invalidPayload = {
      partnerCode: 'MOMO',
      orderId: 'FORGED_ORDER',
      requestId: 'FORGED_REQ',
      amount: 100000,
      orderInfo: 'Hack',
      orderType: 'momo_wallet',
      transId: '12345',
      resultCode: 0,
      message: 'Fake success',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
      signature: 'bad_signature_1234567890abcdef',
    };

    const res = await request(app).post('/api/v1/payments/momo-ipn').send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.resultCode).toBe(99);
  });

  it('5. Reconciliation Path 3: Dev Simulation triggers manual settlement', async () => {
    await bookingService.createSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [testSeats[4].id],
      userId: testUser.id,
    });

    const booking = await bookingService.createBooking({
      userId: testUser.id,
      showtimeId: testShowtime.id,
      seatIds: [testSeats[4].id],
      contactEmail: 'sim@cinehub.vn',
    });

    const txnRef = `CH_${booking.code}_SIM_${Date.now()}`;
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: 'MOMO',
        amount: booking.totalAmount,
        txnRef,
        status: 'PENDING',
      },
    });

    // Call dev simulation
    const res = await request(app).post(`/api/v1/dev/payments/${payment.id}/simulate`).send();

    expect(res.status).toBe(200);
    expect(res.body.data.settled).toBe(true);
    expect(res.body.data.payment.status).toBe('SUCCESS');
    expect(res.body.data.booking.status).toBe('CONFIRMED');
    expect(res.body.data.tickets.length).toBe(1);

    // Verify polling endpoint GET /api/v1/booking/:id returns confirmed booking with signed tickets
    const pollRes = await request(app)
      .get(`/api/v1/booking/${booking.id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(pollRes.status).toBe(200);
    expect(pollRes.body.data.status).toBe('CONFIRMED');
    expect(pollRes.body.data.tickets[0].qrCode).toBeDefined();

    const verifiedId = verifyQr(
      pollRes.body.data.tickets[0].qrCode,
      pollRes.body.data.tickets[0].qrVersion,
    );
    expect(verifiedId).toBe(pollRes.body.data.tickets[0].id);
  });
});
