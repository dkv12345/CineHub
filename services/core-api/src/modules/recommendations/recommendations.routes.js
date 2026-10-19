import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { recommendationsSchema } from './recommendations.schema.js';
import * as controller from './recommendations.controller.js';

export const recommendationsRouter = Router();

recommendationsRouter.post('/', validate(recommendationsSchema), controller.list);
