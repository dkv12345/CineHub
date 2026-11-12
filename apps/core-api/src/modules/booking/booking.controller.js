import { prisma } from '@cinehub/db';
import * as bookingService from './booking.service.js';
import { subscribeSseClient } from './booking.realtime.js';

export function status(_req, res) {
  res.json({
    module: 'booking',
    status: bookingService.BOOKING_MODULE_STATUS,
  });
}

export async function getSeats(req, res, next) {
  try {
    const { showtimeId } = req.params;
    const viewerUserId = req.user?.id || req.query.userId || null;
    const data = await bookingService.getSeatMap(showtimeId, viewerUserId, req.query);
    res.status(200).json({ data });
  } catch (err) {
    next(err);
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
    const result = await bookingService.createSeatHold({
      ...req.body,
      userId: req.user?.id,
      userEmail: req.user?.email,
    });
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function releaseHold(req, res, next) {
  try {
    const { showtimeId } = req.params;
    const seatId = req.query.seatId || req.body?.seatId || null;
    const result = await bookingService.releaseSeatHold({
      showtimeId,
      userId: req.user?.id,
      seatId,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function releaseSingleSeat(req, res, next) {
  try {
    const { showtimeId, seatId } = req.params;
    const result = await bookingService.releaseSeatHold({
      showtimeId,
      userId: req.user?.id,
      seatId,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
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

export async function checkout(req, res, next) {
  try {
    const result = await bookingService.checkoutBooking({
      ...req.body,
      userId: req.user.id,
      userEmail: req.user.email,
    });
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
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
