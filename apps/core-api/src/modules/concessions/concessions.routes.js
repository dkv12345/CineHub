import { Router } from 'express';
import { validate } from '../../platform/http/validate.js';
import { listConcessionsSchema } from './concessions.schema.js';
import * as controller from './concessions.controller.js';

export const concessionsRouter = Router();

concessionsRouter.get('/', validate(listConcessionsSchema), controller.list);
