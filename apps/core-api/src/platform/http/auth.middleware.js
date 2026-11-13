import { AppError } from '../utils/errors.js';
import { verifyAccessToken } from '../security/jwt.js';

/**
 * Authentication Middleware.
 *
 * Verifies Bearer JWT access token from Authorization header.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 *
 * Specification:
 * 1. Extract header `Authorization: Bearer <token>`.
 * 2. If token is missing, throw new AppError(401, 'UNAUTHORIZED', 'Authentication token required').
 * 3. Verify token with verifyAccessToken(token).
 * 4. On TokenExpiredError, return HTTP 401 with code 'TOKEN_EXPIRED' to signal frontend interceptor to refresh.
 * 5. Attach decoded payload to req.user = { id: payload.sub, email: payload.email, role: payload.role }.
 * 6. Invoke next().
 */
export function requireAuth(req, _res, next) {
  const match = (req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : req.query?.token || null;
  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token required'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    return next();
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token has expired'));
    }
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid authentication token'));
  }
}

/**
 * Role-based Authorization Middleware Factory.
 *
 * Restricts route access to users with specified roles.
 *
 * @param {...string} roles - Allowed roles (e.g., 'ADMIN', 'STAFF').
 * @returns {import('express').RequestHandler}
 *
 * Specification:
 * 1. Ensure req.user exists and has an authorized role.
 * 2. If unauthorized, throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions').
 * 3. If authorized, invoke next().
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    return next();
  };
}

/**
 * Optional Authentication Middleware.
 * Populates req.user if a valid token is provided, but continues without error if not.
 */
export function optionalAuth(req, _res, next) {
  const match = (req.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return next();
  }
  try {
    const payload = verifyAccessToken(match[1]);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    // Ignore expired or invalid token for optional endpoints
  }
  return next();
}
