import { Router } from 'express';
import * as controller from './sessions.controller.js';

export const sessionsRouter = Router();

sessionsRouter.get('/', controller.list);
