import { env } from '../config/env.js';

/**
 * Generates a signed short-lived JSON Web Token (Access Token).
 *
 * @param {object} _payload - Token payload data (e.g., { sub: userId, role, email }).
 * @param {object} [_options] - Optional jwt sign options (e.g., custom expiresIn).
 * @returns {string} Signed JWT access token.
 *
 * Specification:
 * - Secret: env.JWT_ACCESS_SECRET
 * - Default Expiration: 15 minutes ('15m')
 * - Algorithm: 'HS256'
 */
export function generateAccessToken(_payload, _options = {}) {
  void env;
  // SKELETON: To be implemented with jsonwebtoken.sign()
  throw new Error('Not implemented: generateAccessToken');
}

/**
 * Generates a signed long-lived JSON Web Token (Refresh Token).
 *
 * @param {object} _payload - Token payload data (e.g., { sub: userId, familyId }).
 * @param {object} [_options] - Optional jwt sign options (e.g., custom expiresIn).
 * @returns {string} Signed JWT refresh token.
 *
 * Specification:
 * - Secret: env.JWT_REFRESH_SECRET
 * - Default Expiration: 7 days ('7d')
 * - Algorithm: 'HS256'
 */
export function generateRefreshToken(_payload, _options = {}) {
  void env;
  // SKELETON: To be implemented with jsonwebtoken.sign()
  throw new Error('Not implemented: generateRefreshToken');
}

/**
 * Verifies and decodes a JWT Access Token.
 *
 * @param {string} _token - Bearer access token string.
 * @returns {object} Decoded token payload if valid.
 * @throws {import('jsonwebtoken').TokenExpiredError} When token has expired.
 * @throws {import('jsonwebtoken').JsonWebTokenError} When signature or token is invalid.
 *
 * Specification:
 * - Secret: env.JWT_ACCESS_SECRET
 */
export function verifyAccessToken(_token) {
  void env;
  // SKELETON: To be implemented with jsonwebtoken.verify()
  throw new Error('Not implemented: verifyAccessToken');
}

/**
 * Verifies and decodes a JWT Refresh Token.
 *
 * @param {string} _token - Refresh token string.
 * @returns {object} Decoded token payload if valid.
 * @throws {import('jsonwebtoken').TokenExpiredError} When token has expired.
 * @throws {import('jsonwebtoken').JsonWebTokenError} When signature or token is invalid.
 *
 * Specification:
 * - Secret: env.JWT_REFRESH_SECRET
 */
export function verifyRefreshToken(_token) {
  void env;
  // SKELETON: To be implemented with jsonwebtoken.verify()
  throw new Error('Not implemented: verifyRefreshToken');
}

/**
 * Computes SHA-256 hash of a refresh token for secure database storage.
 *
 * @param {string} _token - Plain refresh token.
 * @returns {string} Hex-encoded SHA-256 hash (64 characters).
 */
export function hashToken(_token) {
  // SKELETON: To be implemented with crypto.createHash('sha256')
  throw new Error('Not implemented: hashToken');
}
