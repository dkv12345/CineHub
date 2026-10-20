import { AppError } from '../../lib/errors.js';

/**
 * Handles new user registration request.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Read validated registration data from `_req.valid.body`.
 * 2. Invoke `authService.registerUser(_req.valid.body)`.
 * 3. Respond with HTTP 201 Created and { data: { user } }.
 */
export async function register(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'Register handler not implemented yet'));
}

/**
 * Handles user login request and issues authentication cookies.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Extract email and password from `_req.valid.body`.
 * 2. Extract client metadata: `_req.headers['user-agent']`, `_req.ip`.
 * 3. Invoke `authService.loginUser(...)`.
 * 4. Set HTTP-only cookie for refresh token:
 *    _res.cookie('refreshToken', result.refreshToken, {
 *      httpOnly: true,
 *      secure: process.env.NODE_ENV === 'production',
 *      sameSite: 'strict',
 *      path: '/api',
 *      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
 *    });
 * 5. Respond with HTTP 200 OK and { data: { user: result.user, accessToken: result.accessToken } }.
 */
export async function login(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'Login handler not implemented yet'));
}

/**
 * Handles token refresh request using cookie or request body (PUT /refresh-token).
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Retrieve refresh token from `_req.cookies?.refreshToken` or `_req.valid?.body?.refreshToken`.
 * 2. If token is missing, throw new AppError(401, 'UNAUTHORIZED', 'Refresh token required').
 * 3. Invoke `authService.refreshSession(...)`.
 * 4. Update HTTP-only cookie with new rotated refresh token.
 * 5. Respond with HTTP 200 OK and { data: { user: result.user, accessToken: result.accessToken } }.
 */
export async function refreshToken(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'RefreshToken handler not implemented yet'));
}

/**
 * Handles user logout and clears authentication cookie.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Retrieve refresh token from cookie or body.
 * 2. Invoke `authService.logoutUser({ refreshToken })`.
 * 3. Clear cookie: `_res.clearCookie('refreshToken', { path: '/api' })`.
 * 4. Respond with HTTP 200 OK and { message: 'Logged out successfully' }.
 */
export async function logout(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'Logout handler not implemented yet'));
}

/**
 * Retrieves the currently authenticated user's profile.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Read authenticated userId from `_req.user.id`.
 * 2. Invoke `authService.getCurrentUser(_req.user.id)`.
 * 3. Respond with HTTP 200 OK and { data: { user } }.
 */
export async function getMe(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'GetMe handler not implemented yet'));
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
export async function loginWithGoogle(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'Google login handler not implemented yet'));
}

/**
 * Handles password reset request dispatch.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Extract `email` from `_req.valid.body`.
 * 2. Invoke `authService.forgotPassword({ email })`.
 * 3. Respond with HTTP 200 OK and { message: 'If an account exists, a reset link has been dispatched' }.
 */
export async function forgotPassword(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'ForgotPassword handler not implemented yet'));
}

/**
 * Handles password reset confirmation with token.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Extract `token` and `newPassword` from `_req.valid.body`.
 * 2. Invoke `authService.resetPassword({ token, newPassword })`.
 * 3. Respond with HTTP 200 OK and { message: 'Password updated successfully' }.
 */
export async function resetPassword(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'ResetPassword handler not implemented yet'));
}
