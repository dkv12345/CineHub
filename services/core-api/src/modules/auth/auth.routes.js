import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { registerSchema, loginSchema, refreshTokenSchema } from './auth.schema.js';
import * as authController from './auth.controller.js';

export const authRouter = Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new customer account
 */
authRouter.post('/register', validate(registerSchema), authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login with email and password, receives access token and refresh token cookie
 */
authRouter.post('/login', validate(loginSchema), authController.login);

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token using HTTP-only cookie or request body
 */
authRouter.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route POST /api/auth/logout
 * @desc Revoke refresh token and clear session cookie
 */
authRouter.post('/logout', authController.logout);

/**
 * @route GET /api/auth/me
 * @desc Get currently authenticated user profile
 */
authRouter.get('/me', requireAuth, authController.getMe);
