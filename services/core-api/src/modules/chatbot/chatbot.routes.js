import { Router } from 'express';
import { optionalAuth } from '../../middleware/optionalAuth.js';
import { validate } from '../../middleware/validate.js';
import { chatMessageSchema } from './chatbot.schema.js';
import * as controller from './chatbot.controller.js';

export const chatbotRouter = Router();

chatbotRouter.post('/', optionalAuth, validate(chatMessageSchema), controller.reply);
