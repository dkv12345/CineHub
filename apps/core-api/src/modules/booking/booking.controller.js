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
