import { Router } from 'express';
import { optionalAuth } from '../../platform/http/optionalAuth.js';
import { validate } from '../../platform/http/validate.js';
import { chatMessageSchema } from './chatbot.schema.js';
import * as controller from './chatbot.controller.js';

export const chatbotRouter = Router();

chatbotRouter.post('/', optionalAuth, validate(chatMessageSchema), controller.reply);
