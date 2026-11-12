import { Router } from 'express';
import { requireAuth } from '../../platform/http/auth.middleware.js';
import { optionalAuth } from '../../platform/http/optionalAuth.js';
import { validate } from '../../platform/http/validate.js';
import {
  holdSeatsRequestSchema,
  validateVoucherRequestSchema,
  updateConcessionsRequestSchema,
  checkoutRequestSchema,
} from './booking.schema.js';
import * as controller from './booking.controller.js';

export const bookingRouter = Router();

bookingRouter.get('/status', controller.status);
bookingRouter.get('/seats/:showtimeId', optionalAuth, controller.getSeats);
bookingRouter.get('/stream/:showtimeId', optionalAuth, controller.streamShowtimeSeats);
bookingRouter.get('/holds/current', requireAuth, controller.getCurrentHold);
bookingRouter.post('/holds', requireAuth, validate(holdSeatsRequestSchema), controller.holdSeats);
bookingRouter.delete('/holds/:showtimeId', requireAuth, controller.releaseHold);
bookingRouter.delete('/holds/:showtimeId/seats/:seatId', requireAuth, controller.releaseSingleSeat);
bookingRouter.post(
  '/vouchers/validate',
  optionalAuth,
  validate(validateVoucherRequestSchema),
  controller.validateVoucher,
);
bookingRouter.put(
  '/:bookingId/concessions',
  requireAuth,
  validate(updateConcessionsRequestSchema),
  controller.updateConcessions,
);
bookingRouter.post('/checkout', requireAuth, validate(checkoutRequestSchema), controller.checkout);
bookingRouter.get('/tickets', requireAuth, controller.listTickets);
bookingRouter.get('/tickets/:id', optionalAuth, controller.getTicketById);
bookingRouter.get('/:codeOrId/status', optionalAuth, controller.getBookingStatus);
