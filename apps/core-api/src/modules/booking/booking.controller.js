import * as bookingService from './booking.service.js';

export function status(_req, res) {
  res.status(200).json({
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
