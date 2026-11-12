import { Router } from 'express';
import { requireAuth } from '../../platform/http/auth.middleware.js';
import * as controller from './tickets.controller.js';

export const ticketsRouter = Router();

ticketsRouter.post('/scan', requireAuth, controller.scanTicket);
ticketsRouter.post('/check-in', requireAuth, controller.scanTicket);
