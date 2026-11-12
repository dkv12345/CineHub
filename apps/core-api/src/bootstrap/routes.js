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
import { staffRouter } from '../modules/staff/index.js';
import { adminRouter } from '../modules/admin/index.js';
import { memberRouter } from '../modules/member/index.js';

export const routes = Router();

const mounts = [
  ['/health', healthRouter],
  ['/auth', authRouter],
  ['/cinemas', cinemasRouter],
  ['/concessions', concessionsRouter],
  ['/chatbot', chatbotRouter],
  ['/recommendations', recommendationsRouter],
  ['/movies', moviesRouter],
  ['/sessions', sessionsRouter],
  ['/booking', bookingRouter],
  ['/payments', paymentRouter],
  ['/staff', staffRouter],
  ['/admin', adminRouter],
  ['/member', memberRouter],
];

for (const [prefix, router] of mounts) {
  routes.use(prefix, router);
  routes.use(`/v1${prefix}`, router);
}
