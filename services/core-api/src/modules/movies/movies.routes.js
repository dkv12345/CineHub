import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { getMovieSchema } from './movies.schema.js';
import * as controller from './movies.controller.js';

export const moviesRouter = Router();

moviesRouter.get('/:id', validate(getMovieSchema), controller.get);
