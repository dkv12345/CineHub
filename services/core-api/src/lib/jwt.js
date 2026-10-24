import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ALGORITHM = 'HS256';

/** Lifetime of an access token. Kept in sync with the `maxAge` documented in the README. */
export const ACCESS_TOKEN_TTL = '15m';
/** Lifetime of a refresh token (also used for the cookie `maxAge` and DB `expiresAt`). */
export const REFRESH_TOKEN_TTL = '7d';
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generates a signed short-lived JSON Web Token (Access Token).
 *
 * @param {object} payload - Token payload data (e.g., { sub: userId, role, email }).
 * @param {object} [options] - Optional jwt sign options (e.g., custom expiresIn).
 * @returns {string} Signed JWT access token.
 *
 * Specification:
 * - Secret: env.JWT_ACCESS_SECRET
 * - Default Expiration: 15 minutes ('15m')
 * - Algorithm: 'HS256'
 */
export function generateAccessToken(payload, options = {}) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: ACCESS_TOKEN_TTL,
    ...options,
  });
}

/**
 * Generates a signed long-lived JSON Web Token (Refresh Token).
 *
 * A random `jti` is added so two refresh tokens issued within the same second for the
 * same user/family never collide on their SHA-256 hash (`refresh_tokens.tokenHash` is unique).
 *
 * @param {object} payload - Token payload data (e.g., { sub: userId, familyId }).
 * @param {object} [options] - Optional jwt sign options (e.g., custom expiresIn).
 * @returns {string} Signed JWT refresh token.
 *
 * Specification:
 * - Secret: env.JWT_REFRESH_SECRET
 * - Default Expiration: 7 days ('7d')
 * - Algorithm: 'HS256'
 */
export function generateRefreshToken(payload, options = {}) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: REFRESH_TOKEN_TTL,
    jwtid: crypto.randomUUID(),
    ...options,
  });
}

/**
 * Verifies and decodes a JWT Access Token.
 *
 * @param {string} token - Bearer access token string.
 * @returns {object} Decoded token payload if valid.
 * @throws {import('jsonwebtoken').TokenExpiredError} When token has expired.
 * @throws {import('jsonwebtoken').JsonWebTokenError} When signature or token is invalid.
 *
 * Specification:
 * - Secret: env.JWT_ACCESS_SECRET
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALGORITHM] });
}

/**
 * Verifies and decodes a JWT Refresh Token.
 *
 * @param {string} token - Refresh token string.
 * @returns {object} Decoded token payload if valid.
 * @throws {import('jsonwebtoken').TokenExpiredError} When token has expired.
 * @throws {import('jsonwebtoken').JsonWebTokenError} When signature or token is invalid.
 *
 * Specification:
 * - Secret: env.JWT_REFRESH_SECRET
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALGORITHM] });
}

/**
 * Computes SHA-256 hash of a token for secure database storage.
 *
 * @param {string} token - Plain token (refresh token, reset token, ...).
 * @returns {string} Hex-encoded SHA-256 hash (64 characters).
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
