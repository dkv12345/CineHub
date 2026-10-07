import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { listCinemasSchema } from './cinemas.schema.js';
import * as controller from './cinemas.controller.js';

export const cinemasRouter = Router();

cinemasRouter.get('/', validate(listCinemasSchema), controller.list);
