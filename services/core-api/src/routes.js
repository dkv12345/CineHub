import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { cinemasRouter } from './modules/cinemas/cinemas.routes.js';
import { concessionsRouter } from './modules/concessions/concessions.routes.js';
import { chatbotRouter } from './modules/chatbot/chatbot.routes.js';
import { recommendationsRouter } from './modules/recommendations/recommendations.routes.js';
import { moviesRouter } from './modules/movies/movies.routes.js';

export const routes = Router();

routes.use('/health', healthRouter);
routes.use('/auth', authRouter);
routes.use('/v1/auth', authRouter);
routes.use('/cinemas', cinemasRouter);
routes.use('/concessions', concessionsRouter);
routes.use('/chatbot', chatbotRouter);
routes.use('/recommendations', recommendationsRouter);
routes.use('/movies', moviesRouter);
