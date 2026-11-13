import 'dotenv/config';
import crypto from 'node:crypto';
import querystring from 'qs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@cinehub/db';
import { createApp } from '../src/bootstrap/app.js';
import { getRedisClient, closeRedis } from '../src/platform/cache/redis.js';
import * as bookingService from '../src/modules/booking/booking.service.js';
import { env } from '../src/platform/config/env.js';
import { generateAccessToken } from '../src/platform/security/jwt.js';

describe('VNPAY & ZaloPay Integration Tests (Phase E & F)', () => {
  let app;
  let redis;
  let testUser;
  let userToken;
  let testAuditorium;
  let testMovie;
  let testShowtime;
  let testSeat;

  beforeAll(async () => {
    app = createApp();
    redis = getRedisClient();
    if (redis.status === 'wait') await redis.connect();

    testUser = await prisma.user.findFirst();
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
        name: `Auditorium Gateways ${Date.now()}`,
        totalSeats: 3,
        totalCapacity: 3,
      },
    });

    testMovie =
      (await prisma.movie.findFirst()) ||
      (await prisma.movie.create({
        data: {
          title: 'Gateway Test Movie',
          slug: `gw-movie-${Date.now()}`,
          status: 'NOW_SHOWING',
          duration: 120,
          ageRating: 'P',
        },
      }));

    const dedup = crypto.createHash('sha1').update(`gw-dedup-${Date.now()}`).digest('hex');
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

    testSeat = await prisma.seat.create({
      data: {
        auditoriumId: testAuditorium.id,
        seatTypeId: seatType.id,
        rowLabel: 'C',
        colNumber: 1,
        label: 'C1',
        posX: 20,
        posY: 50,
        isActive: true,
      },
    });
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

  it('1. VNPAY: Initiates payment with HMAC-SHA512 signed payUrl', async () => {
    await bookingService.createSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [testSeat.id],
      userId: testUser.id,
    });

    const booking = await bookingService.createBooking({
      userId: testUser.id,
      showtimeId: testShowtime.id,
      seatIds: [testSeat.id],
      contactEmail: 'vnpay@cinehub.vn',
    });

    const res = await request(app)
      .post(`/api/v1/booking/${booking.id}/payments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'VNPAY' });

    expect(res.status).toBe(200);
    expect(res.body.data.payUrl).toContain('vnp_SecureHash=');
    expect(res.body.data.txnRef).toBeDefined();
  });

  it('2. VNPAY: IPN with valid HMAC-SHA512 settles payment and confirms booking', async () => {
    const booking = await prisma.booking.findFirst({
      where: { showtimeId: testShowtime.id },
    });

    const txnRef = `CH_${booking.code}_VNP_${Date.now()}`;
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: 'VNPAY',
        amount: booking.totalAmount,
        txnRef,
        status: 'PENDING',
      },
    });

    const vnpParams = {
      vnp_TmnCode: env.VNP_TMN_CODE,
      vnp_Amount: (booking.totalAmount * 100).toString(),
      vnp_BankCode: 'NCB',
      vnp_BankTranNo: 'VNP123456',
      vnp_CardType: 'ATM',
      vnp_PayDate: '20261112200000',
      vnp_OrderInfo: 'Thanh toan ve',
      vnp_TransactionNo: '14567890',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TxnRef: txnRef,
    };

    const sorted = {};
    Object.keys(vnpParams)
      .sort()
      .forEach((k) => {
        sorted[k] = encodeURIComponent(String(vnpParams[k])).replace(/%20/g, '+');
      });

    const signData = querystring.stringify(sorted, { encode: false });
    const signed = crypto
      .createHmac('sha512', env.VNP_HASH_SECRET)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    const res = await request(app)
      .get('/api/v1/payments/vnpay-ipn')
      .query({
        ...vnpParams,
        vnp_SecureHash: signed,
      });

    expect(res.status).toBe(200);
    expect(res.body.RspCode).toBe('00');

    const payment = await prisma.payment.findUnique({ where: { txnRef } });
    expect(payment.status).toBe('SUCCESS');
  });

  it('3. ZaloPay: Callback with valid KEY2 MAC settles payment successfully', async () => {
    // Create dedicated seat and booking for ZaloPay test
    const zpSeat = await prisma.seat.create({
      data: {
        auditoriumId: testAuditorium.id,
        seatTypeId: (await prisma.seatType.findFirst()).id,
        rowLabel: 'C',
        colNumber: 2,
        label: 'C2',
        posX: 40,
        posY: 50,
        isActive: true,
      },
    });

    await bookingService.createSeatHold({
      showtimeId: testShowtime.id,
      seatIds: [zpSeat.id],
      userId: testUser.id,
    });

    const booking = await bookingService.createBooking({
      userId: testUser.id,
      showtimeId: testShowtime.id,
      seatIds: [zpSeat.id],
      contactEmail: 'zalopay@cinehub.vn',
    });

    const txnRef = `CH_${booking.code}_ZP_${Date.now()}`;
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: 'ZALOPAY',
        amount: booking.totalAmount,
        txnRef,
        status: 'PENDING',
      },
    });

    const callbackDataObj = {
      app_id: env.ZALOPAY_APP_ID,
      app_trans_id: txnRef,
      app_time: Date.now(),
      app_user: 'CineHubCustomer',
      amount: booking.totalAmount,
      embed_data: '{}',
      item: '[]',
      zp_trans_id: 250101000001,
      server_time: Date.now(),
      channel: 38,
      merchant_user_id: testUser.id,
    };

    const callbackDataStr = JSON.stringify(callbackDataObj);
    const mac = crypto.createHmac('sha256', env.ZALOPAY_KEY2).update(callbackDataStr).digest('hex');

    const res = await request(app).post('/api/v1/payments/zalopay-callback').send({
      data: callbackDataStr,
      mac,
    });

    expect(res.status).toBe(200);
    expect(res.body.return_code).toBe(1);

    const payment = await prisma.payment.findUnique({ where: { txnRef } });
    expect(payment.status).toBe('SUCCESS');
  });
});
