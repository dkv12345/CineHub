import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  credentialsLimiter,
  emailDispatchLimiter,
  otpVerifyLimiter,
  resetPasswordLimiter,
} from '../../middleware/rateLimit.js';
import {
  registerSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  loginSchema,
  refreshTokenSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';
import * as authController from './auth.controller.js';

export const authRouter = Router();

/**
 * @route POST /api/v1/auth/register (or /api/auth/register)
 * @desc Register a new customer account and e-mail a 6-digit verification OTP
 */
authRouter.post('/register', credentialsLimiter, validate(registerSchema), authController.register);

/**
 * @route POST /api/v1/auth/verify-email (or /api/auth/verify-email)
 * @desc Confirm the e-mail OTP; activates the account, sends welcome e-mail and signs the user in
 */
authRouter.post(
  '/verify-email',
  otpVerifyLimiter,
  validate(verifyEmailSchema),
  authController.verifyEmail,
);

/**
 * @route POST /api/v1/auth/resend-verification (or /api/auth/resend-verification)
 * @desc Send a new verification OTP to a still-unverified account
 */
authRouter.post(
  '/resend-verification',
  emailDispatchLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification,
);

/**
 * @route POST /api/v1/auth/login (or /api/auth/login)
 * @desc Login with email and password, receives access token and refresh token cookie
 */
authRouter.post('/login', credentialsLimiter, validate(loginSchema), authController.login);

/**
 * @route POST /api/v1/auth/logout (or /api/auth/logout)
 * @desc Revoke refresh token and clear session cookie
 */
authRouter.post('/logout', authController.logout);

/**
 * @route PUT /api/v1/auth/refresh-token (or /api/auth/refresh-token)
 * @desc Refresh access token using HTTP-only cookie or request body (RTR)
 */
authRouter.put('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route POST /api/v1/auth/refresh-token (Compatibility Alias)
 */
authRouter.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route GET /api/v1/auth/me (or /api/auth/me)
 * @desc Get currently authenticated user profile
 */
authRouter.get('/me', requireAuth, authController.getMe);

/**
 * @route POST /api/v1/auth/google (or /api/auth/google)
 * @desc Authenticate with Google OAuth ID token
 */
authRouter.post('/google', validate(googleAuthSchema), authController.loginWithGoogle);

/**
 * @route POST /api/v1/auth/forgot-password (or /api/auth/forgot-password)
 * @desc Request password reset token dispatch
 */
authRouter.post(
  '/forgot-password',
  emailDispatchLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

/**
 * @route POST /api/v1/auth/reset-password (or /api/auth/reset-password)
 * @desc Complete password reset using verification token
 */
authRouter.post(
  '/reset-password',
  resetPasswordLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);
