import { Router } from 'express';
import { requireAuth } from '../../platform/http/auth.middleware.js';
import { validate } from '../../platform/http/validate.js';
import { holdSeatsRequestSchema } from './booking.schema.js';
import * as controller from './booking.controller.js';

export const bookingRouter = Router();

bookingRouter.get('/status', controller.status);
bookingRouter.post('/holds', requireAuth, validate(holdSeatsRequestSchema), controller.holdSeats);
