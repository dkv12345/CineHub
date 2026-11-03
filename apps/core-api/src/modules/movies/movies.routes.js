import { Router } from 'express';
import * as controller from './movies.controller.js';

export const moviesRouter = Router();

moviesRouter.get('/', controller.list);
moviesRouter.get('/:id', controller.get);
