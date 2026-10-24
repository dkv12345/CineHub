import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Builds a limiter that answers with the project's standard `{ error: { code, message } }` shape.
 *
 * Limits are per-process (in-memory). Behind a load balancer, back this with a shared store
 * (e.g. rate-limit-redis) and configure `trust proxy`.
 *
 * @param {object} options
 * @param {number} options.max - Requests allowed per window.
 * @param {number} [options.windowMs] - Window length (default 15 minutes).
 * @param {(req: import('express').Request) => string} [options.key] - Custom bucket key.
 */
function createLimiter({ max, windowMs = 15 * 60 * 1000, key }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    keyGenerator: key ?? ((req) => req.ip),
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many attempts, please try again later',
        },
      });
    },
  });
}

const emailKey = (req) => `${req.ip}:${String(req.body?.email ?? '').toLowerCase()}`;

/** Login / register: slows down credential stuffing and mass sign-ups. */
export const credentialsLimiter = createLimiter({ max: 20 });

/** OTP confirmation: 6 digits can be brute-forced, so keep attempts per (ip, email) very low. */
export const otpVerifyLimiter = createLimiter({ max: 5, key: emailKey });

/** Anything that sends an e-mail (resend OTP, forgot password): stops mailbox flooding. */
export const emailDispatchLimiter = createLimiter({ max: 5, key: emailKey });

/** Reset-token redemption. */
export const resetPasswordLimiter = createLimiter({ max: 10 });
