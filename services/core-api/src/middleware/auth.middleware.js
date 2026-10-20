import { AppError } from '../lib/errors.js';

/**
 * Authentication Middleware.
 *
 * Verifies Bearer JWT access token from Authorization header.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} _next
 *
 * Specification:
 * 1. Extract header `Authorization: Bearer <token>`.
 * 2. If token is missing, throw new AppError(401, 'UNAUTHORIZED', 'Authentication token required').
 * 3. Verify token with verifyAccessToken(token).
 * 4. On TokenExpiredError, return HTTP 401 with code 'TOKEN_EXPIRED' to signal frontend interceptor to refresh.
 * 5. Attach decoded payload to req.user = { id: payload.sub, email: payload.email, role: payload.role }.
 * 6. Invoke next().
 */
export function requireAuth(_req, _res, _next) {
  // SKELETON: To be implemented by student
  _next(new AppError(501, 'NOT_IMPLEMENTED', 'Authentication middleware not implemented yet'));
}

/**
 * Role-based Authorization Middleware Factory.
 *
 * Restricts route access to users with specified roles.
 *
 * @param {...string} _roles - Allowed roles (e.g., 'ADMIN', 'STAFF').
 * @returns {import('express').RequestHandler}
 *
 * Specification:
 * 1. Ensure req.user exists and has an authorized role.
 * 2. If unauthorized, throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions').
 * 3. If authorized, invoke next().
 */
export function requireRole(..._roles) {
  // SKELETON: To be implemented by student
  return (_req, _res, _next) => {
    _next(
      new AppError(501, 'NOT_IMPLEMENTED', 'Role authorization middleware not implemented yet'),
    );
  };
}
