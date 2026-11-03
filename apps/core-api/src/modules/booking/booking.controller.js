import { createSeatHold, BOOKING_MODULE_STATUS } from './booking.service.js';

export function status(_req, res) {
  res.status(200).json({
    module: 'booking',
    status: BOOKING_MODULE_STATUS,
    message: 'Booking module skeleton (planned). See docs/adr/0006-booking-module-planned.md.',
  });
}

export async function holdSeats(req, res) {
  const result = await createSeatHold(req.valid?.body);
  res.status(201).json({ data: result });
}
