import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';
import { cinemasRouter } from './modules/cinemas/cinemas.routes.js';

export const routes = Router();

routes.use('/health', healthRouter);
routes.use('/cinemas', cinemasRouter);
