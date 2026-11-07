import { Router } from 'express';
import { validate } from '../../platform/http/validate.js';
import * as controller from './sessions.controller.js';
import { listSessionsSchema } from './sessions.schema.js';

export const sessionsRouter = Router();

sessionsRouter.get('/', validate(listSessionsSchema), controller.list);
