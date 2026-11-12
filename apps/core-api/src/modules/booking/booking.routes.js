import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../platform/http/auth.middleware.js';
import { validate } from '../../platform/http/validate.js';
import { holdSeatsRequestSchema } from './booking.schema.js';
import * as controller from './booking.controller.js';

export const bookingRouter = Router();

bookingRouter.get('/status', controller.status);
bookingRouter.get('/showtimes/:showtimeId/seats', optionalAuth, controller.getSeats);
bookingRouter.post('/holds', requireAuth, validate(holdSeatsRequestSchema), controller.holdSeats);
bookingRouter.delete(
  '/holds',
  requireAuth,
  validate(holdSeatsRequestSchema),
  controller.releaseSeats,
);

// Booking & Checkout Flow
bookingRouter.post('/checkout', requireAuth, controller.checkoutBooking);
bookingRouter.post('/:id/payments', requireAuth, controller.initiatePayment);
bookingRouter.post('/:id/payments/refresh', requireAuth, controller.refreshPayment);
bookingRouter.get('/:id', requireAuth, controller.getBooking);

// Alias showtime-specific endpoints
bookingRouter.get('/:showtimeId/seats', optionalAuth, controller.getSeats);
bookingRouter.post('/:showtimeId/seat-holds', requireAuth, controller.holdSeats);
bookingRouter.delete('/:showtimeId/seat-holds', requireAuth, controller.releaseSeats);
