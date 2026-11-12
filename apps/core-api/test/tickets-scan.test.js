import 'dotenv/config';
import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '@cinehub/db';
import { createApp } from '../src/bootstrap/app.js';
import { generateAccessToken } from '../src/platform/security/jwt.js';
import { buildQr } from '../src/platform/utils/qr.js';

describe('Ticket QR Scanning & Check-in Tests (Phase G)', () => {
  let app;
  let testStaff;
  let staffToken;
  let testTicket;
  let validQr;
  let testShowtime;

  beforeAll(async () => {
    app = createApp();

    testStaff = await prisma.user.findFirst();
    staffToken = generateAccessToken({
      sub: testStaff.id,
      email: testStaff.email,
      role: 'STAFF',
    });

    const cinema = await prisma.cinema.findFirst();
    const movie = await prisma.movie.findFirst();
    const seatType = await prisma.seatType.findFirst();
    const ticketType = await prisma.ticketType.findFirst();

    const auditorium = await prisma.auditorium.create({
      data: {
        cinemaId: cinema.id,
        name: `Auditorium Scan ${Date.now()}`,
        totalSeats: 1,
        totalCapacity: 1,
      },
    });

    const dedup = crypto.createHash('sha1').update(`scan-dedup-${Date.now()}`).digest('hex');
    testShowtime = await prisma.showtime.create({
      data: {
        movieId: movie.id,
        auditoriumId: auditorium.id,
        cinemaId: cinema.id,
        dedupKey: dedup,
        startTime: new Date(Date.now() + 86400000),
        endTime: new Date(Date.now() + 86400000 + 7200000),
        localDate: new Date('2026-11-13'),
      },
    });

    const seat = await prisma.seat.create({
      data: {
        auditoriumId: auditorium.id,
        seatTypeId: seatType.id,
        rowLabel: 'D',
        colNumber: 1,
        label: 'D1',
        posX: 20,
        posY: 50,
      },
    });

    const showtimeSeat = await prisma.showtimeSeat.create({
      data: {
        showtimeId: testShowtime.id,
        seatId: seat.id,
        status: 'SOLD',
      },
    });

    const booking = await prisma.booking.create({
      data: {
        code: `CH${Date.now()}`,
        userId: testStaff.id,
        showtimeId: testShowtime.id,
        status: 'CONFIRMED',
        totalAmount: 100000,
        contactEmail: 'staff@cinehub.vn',
        expiresAt: new Date(Date.now() + 900000),
        seats: {
          create: [
            {
              showtimeSeatId: showtimeSeat.id,
              seatLabel: 'D1',
              seatTypeCode: 'STANDARD',
              ticketTypeId: ticketType.id,
              ticketTypeCode: ticketType.code,
              price: 100000,
            },
          ],
        },
      },
      include: {
        seats: true,
      },
    });

    testTicket = await prisma.ticket.create({
      data: {
        bookingId: booking.id,
        bookingSeatId: booking.seats[0].id,
        qrVersion: 1,
        status: 'VALID',
      },
    });

    validQr = buildQr(testTicket.id, testTicket.qrVersion);
  });

  afterAll(async () => {
    if (testShowtime) {
      await prisma.ticket.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.bookingSeat.deleteMany({ where: { booking: { showtimeId: testShowtime.id } } });
      await prisma.showtimeSeat.deleteMany({ where: { showtimeId: testShowtime.id } });
      await prisma.booking.deleteMany({ where: { showtimeId: testShowtime.id } });
      await prisma.seat.deleteMany({
        where: { auditorium: { showtimes: { some: { id: testShowtime.id } } } },
      });
      await prisma.showtime.delete({ where: { id: testShowtime.id } });
      await prisma.auditorium.deleteMany({ where: { name: { contains: 'Auditorium Scan' } } });
    }
    await prisma.$disconnect();
  });

  it('1. Successfully checks in a valid QR ticket', async () => {
    const res = await request(app)
      .post('/api/v1/tickets/check-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrString: validQr });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('USED');
    expect(res.body.data.seatLabel).toBe('D1');
    expect(res.body.data.usedAt).toBeDefined();

    const dbTicket = await prisma.ticket.findUnique({ where: { id: testTicket.id } });
    expect(dbTicket.status).toBe('USED');
  });

  it('2. Rejects already used ticket with TICKET_ALREADY_USED', async () => {
    const res = await request(app)
      .post('/api/v1/tickets/check-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrString: validQr });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TICKET_ALREADY_USED');
  });

  it('3. Rejects tampered/forged QR code with INVALID_QR_SIGNATURE', async () => {
    const forgedQr = `${testTicket.id}.fakehmacsignature123`;
    const res = await request(app)
      .post('/api/v1/tickets/check-in')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ qrString: forgedQr });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_QR_SIGNATURE');
  });
});
