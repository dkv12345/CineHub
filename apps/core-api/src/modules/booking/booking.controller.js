import { prisma } from '@cinehub/db';
import * as bookingService from './booking.service.js';
import { subscribeSseClient } from './booking.realtime.js';

export function status(_req, res) {
  res.json({
    module: 'booking',
    status: bookingService.BOOKING_MODULE_STATUS,
    message: 'Booking module ready',
  });
}

export async function getSeats(req, res, next) {
  try {
    const { showtimeId } = req.params;
    const seats = await bookingService.getShowtimeSeats(showtimeId, req.user?.id);
    res.status(200).json({ data: seats });
  } catch (error) {
    next(error);
  }
}

export async function streamShowtimeSeats(req, res, next) {
  try {
    const { showtimeId } = req.params;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const st = await prisma.showtime.findFirst({
      where: { OR: [{ id: showtimeId }, { externalId: showtimeId }] },
      select: { id: true, externalId: true },
    });

    const keys = [showtimeId, st?.id, st?.externalId].filter(Boolean);
    const client = { res, userId: req.user?.id || null };
    const unsubscribe = subscribeSseClient(keys, client);

    res.write(
      `event: connected\ndata: ${JSON.stringify({
        showtimeId: st?.id || showtimeId,
        connectedAt: new Date().toISOString(),
      })}\n\n`,
    );

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentHold(req, res, next) {
  try {
    const showtimeId = req.query.showtimeId || '';
    const data = await bookingService.getCurrentHold({
      showtimeId,
      userId: req.user.id,
    });
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function holdSeats(req, res, next) {
  try {
    const payload = req.valid?.body || req.body;
    const result = await bookingService.createSeatHold({
      showtimeId: payload.showtimeId || req.params.showtimeId,
      seatIds: payload.seatIds,
      userId: req.user.id,
    });
    res.status(201).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function releaseSeats(req, res, next) {
  try {
    const payload = req.valid?.body || req.body;
    const result = await bookingService.releaseSeatHold({
      showtimeId: payload.showtimeId || req.params.showtimeId,
      seatIds: payload.seatIds,
      userId: req.user.id,
    });
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
}

export async function validateVoucher(req, res, next) {
  try {
    const result = await bookingService.validateVoucher({
      code: req.body.code,
      subtotalAmount: req.body.subtotalAmount,
      userId: req.user?.id || null,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateConcessions(req, res, next) {
  try {
    const { bookingId } = req.params;
    const result = await bookingService.updateBookingConcessions({
      bookingId,
      userId: req.user.id,
      items: req.body.items,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function checkoutBooking(req, res, next) {
  try {
    const payload = req.valid?.body || req.body;
    const booking = await bookingService.createBooking({
      userId: req.user.id,
      showtimeId: payload.showtimeId,
      seatIds: payload.seatIds,
      concessions: payload.concessions || [],
      voucherCode: payload.voucherCode,
      contactEmail: payload.contactEmail || req.user.email,
      contactPhone: payload.contactPhone,
    });
    res.status(201).json({ data: booking });
  } catch (error) {
    next(error);
  }
}

export async function initiatePayment(req, res, next) {
  try {
    const { id: bookingId } = req.params;
    const { provider = 'MOMO' } = req.body || {};
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    const paymentResult = await bookingService.initiatePayment({
      bookingId,
      provider,
      userId: req.user.id,
      clientIp,
    });

    res.status(200).json({ data: paymentResult });
  } catch (error) {
    next(error);
  }
}

export async function refreshPayment(req, res, next) {
  try {
    const { id: bookingId } = req.params;
    const booking = await bookingService.refreshBookingPayment({
      bookingId,
      userId: req.user.id,
    });

    res.status(200).json({ data: booking });
  } catch (error) {
    next(error);
  }
}

export async function getBooking(req, res, next) {
  try {
    const { id: bookingId } = req.params;
    const booking = await bookingService.getBookingDetails(bookingId, req.user.id);
    res.status(200).json({ data: booking });
  } catch (error) {
    next(error);
  }
}

export async function listTickets(req, res, next) {
  try {
    const data = await bookingService.listUserTickets(req.user.id);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getTicketById(req, res, next) {
  try {
    const { id } = req.params;
    const data = await bookingService.getUserTicketById(id, req.user?.id || null);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getBookingStatus(req, res, next) {
  try {
    const { codeOrId } = req.params;
    const data = await bookingService.getBookingStatusByCodeOrId(codeOrId);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
