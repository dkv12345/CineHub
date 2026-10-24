import { AppError } from '../../lib/errors.js';
import { REFRESH_TOKEN_TTL_MS } from '../../lib/jwt.js';
import { env } from '../../config/env.js';
import * as authService from './auth.service.js';

/**
 * The refresh token lives in an HTTP-only cookie scoped to `/api`, so it is never readable
 * from JavaScript (XSS) and is not sent to unrelated paths.
 */
const REFRESH_COOKIE = 'refreshToken';
const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api',
};

const setRefreshCookie = (res, token) =>
  res.cookie(REFRESH_COOKIE, token, { ...refreshCookieOptions, maxAge: REFRESH_TOKEN_TTL_MS });

const clientMeta = (req) => ({
  userAgent: req.headers['user-agent'],
  ipAddress: req.ip,
});

const sendSession = (res, result, status = 200) => {
  setRefreshCookie(res, result.refreshToken);
  return res.status(status).json({
    data: { user: result.user, accessToken: result.accessToken },
  });
};

/**
 * Handles new user registration request. Sends the e-mail OTP; no session is issued yet.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function register(req, res) {
  const { user } = await authService.registerUser(req.valid.body);
  res.status(201).json({ data: { user } });
}

/**
 * Confirms the e-mail OTP and signs the user in (sets the refresh cookie).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function verifyEmail(req, res) {
  const { email, code } = req.valid.body;
  const result = await authService.verifyEmail({ email, code, ...clientMeta(req) });
  sendSession(res, result);
}

/**
 * Sends a new verification OTP (generic response to avoid account enumeration).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function resendVerification(req, res) {
  const { message } = await authService.resendVerification({ email: req.valid.body.email });
  res.status(200).json({ message });
}

/**
 * Handles user login request and issues authentication cookies.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function login(req, res) {
  const { email, password } = req.valid.body;
  const result = await authService.loginUser({ email, password, ...clientMeta(req) });
  sendSession(res, result);
}

/**
 * Handles token refresh request using cookie or request body (PUT /refresh-token).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function refreshToken(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE] || req.valid?.body?.refreshToken;
  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token required');
  }

  try {
    const result = await authService.refreshSession({ refreshToken: token, ...clientMeta(req) });
    sendSession(res, result);
  } catch (error) {
    // A dead session must not leave a stale cookie behind.
    if (error instanceof AppError && error.status === 401) {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    }
    throw error;
  }
}

/**
 * Handles user logout and clears authentication cookie.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  await authService.logoutUser({ refreshToken: typeof token === 'string' ? token : undefined });
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.status(200).json({ message: 'Logged out successfully' });
}

/**
 * Retrieves the currently authenticated user's profile.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function getMe(req, res) {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ data: { user } });
}

/**
 * Handles Google OAuth login request from client.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Extract `idToken` from `_req.valid.body`.
 * 2. Extract metadata: `_req.headers['user-agent']`, `_req.ip`.
 * 3. Invoke `authService.loginWithGoogle({ idToken, userAgent, ipAddress })`.
 * 4. Set HTTP-only refresh token cookie.
 * 5. Respond with HTTP 200 OK and { data: { user: result.user, accessToken: result.accessToken } }.
 */
export async function loginWithGoogle(req, res) {
  const { idToken } = req.valid.body;
  const result = await authService.loginWithGoogle({
    idToken,
    ...clientMeta(req),
  });
  sendSession(res, result);
}

/**
 * Handles password reset request dispatch.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function forgotPassword(req, res) {
  await authService.forgotPassword({ email: req.valid.body.email });
  res.status(200).json({ message: 'If an account exists, a reset link has been dispatched' });
}

/**
 * Handles password reset confirmation with token.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function resetPassword(req, res) {
  const { token, newPassword } = req.valid.body;
  await authService.resetPassword({ token, newPassword });
  res.status(200).json({ message: 'Password updated successfully' });
}
