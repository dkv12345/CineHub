import { Router } from 'express';
import { healthRouter } from '../modules/health/index.js';
import { authRouter } from '../modules/auth/index.js';
import { cinemasRouter } from '../modules/cinemas/index.js';
import { concessionsRouter } from '../modules/concessions/index.js';
import { chatbotRouter } from '../modules/chatbot/index.js';
import { recommendationsRouter } from '../modules/recommendations/index.js';
import { moviesRouter } from '../modules/movies/index.js';
import { sessionsRouter } from '../modules/sessions/index.js';
import { bookingRouter } from '../modules/booking/index.js';
import { paymentRouter } from '../modules/payment/index.js';
import { ticketsRouter } from '../modules/tickets/index.js';
import { simulatePaymentController } from '../modules/payment/payment.controller.js';

export const routes = Router();

routes.use('/health', healthRouter);
routes.use('/auth', authRouter);
routes.use('/v1/auth', authRouter);
routes.use('/cinemas', cinemasRouter);
routes.use('/concessions', concessionsRouter);
routes.use('/chatbot', chatbotRouter);
routes.use('/recommendations', recommendationsRouter);
routes.use('/movies', moviesRouter);
routes.use('/sessions', sessionsRouter);
routes.use('/booking', bookingRouter);
routes.use('/showtimes', bookingRouter);
routes.use('/tickets', ticketsRouter);

routes.use('/payments', paymentRouter); // 2. Mount đường dẫn /payments
routes.use('/v1/payments', paymentRouter);
routes.post('/dev/payments/:paymentId/simulate', simulatePaymentController);
