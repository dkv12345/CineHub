import { AppError } from '../../lib/errors.js';

/**
 * Handles new user registration request.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Read validated registration data from `req.valid.body`.
 * 2. Invoke `authService.registerUser(req.valid.body)`.
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
 * 1. Extract email and password from `req.valid.body`.
 * 2. Extract client metadata: `req.headers['user-agent']`, `req.ip`.
 * 3. Invoke `authService.loginUser(...)`.
 * 4. Set HTTP-only cookie for refresh token:
 *    res.cookie('refreshToken', result.refreshToken, {
 *      httpOnly: true,
 *      secure: env.NODE_ENV === 'production',
 *      sameSite: 'strict',
 *      path: '/api/auth',
 *      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
 *    });
 * 5. Respond with HTTP 200 OK and { data: { user: result.user, accessToken: result.accessToken } }.
 */
export async function login(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'Login handler not implemented yet'));
}

/**
 * Handles token refresh request using cookie or request body.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification for student implementation:
 * 1. Retrieve refresh token from `req.cookies.refreshToken` or `req.valid?.body?.refreshToken`.
 * 2. If token is missing, throw new AppError(401, 'UNAUTHORIZED', 'Refresh token required').
 * 3. Invoke `authService.refreshSession(...)`.
 * 4. Update HTTP-only cookie with new refresh token.
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
 * 3. Clear cookie: `res.clearCookie('refreshToken', { path: '/api/auth' })`.
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
 * 1. Read authenticated userId from `req.user.id`.
 * 2. Invoke `authService.getCurrentUser(req.user.id)`.
 * 3. Respond with HTTP 200 OK and { data: { user } }.
 */
export async function getMe(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'GetMe handler not implemented yet'));
}
