/**
 * Registers a new user account.
 *
 * @param {object} params
 * @param {string} params.email - User email address.
 * @param {string} params.password - Plaintext password.
 * @param {string} params.fullName - Full display name.
 * @param {string} [params.phone] - Contact phone number.
 * @returns {Promise<{ user: object }>} Created user entity (without passwordHash).
 *
 * Specification for student implementation:
 * 1. Check if email already exists in `prisma.user`.
 *    - If exists, throw new AppError(409, 'CONFLICT', 'Email already registered').
 * 2. Hash password with bcryptjs (recommended cost: 10).
 * 3. Save new user into `prisma.user` with role 'CUSTOMER' and status 'ACTIVE'.
 * 4. Return user object excluding `passwordHash`.
 */
export async function registerUser(_params) {
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: registerUser');
}

/**
 * Authenticates user credentials and generates token session.
 *
 * @param {object} params
 * @param {string} params.email - User email address.
 * @param {string} params.password - Plaintext password.
 * @param {string} [params.userAgent] - Client User-Agent header.
 * @param {string} [params.ipAddress] - Client IP address.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 *
 * Specification for student implementation:
 * 1. Query user by email from `prisma.user`.
 * 2. If user not found, or user.status !== 'ACTIVE', or password doesn't match bcrypt:
 *    - Throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password').
 * 3. Generate accessToken (15m expiry) containing { sub: user.id, role: user.role, email: user.email }.
 * 4. Generate a unique `familyId` (UUID v7 or crypto.randomUUID).
 * 5. Generate refreshToken (7d expiry) containing { sub: user.id, familyId }.
 * 6. Store SHA-256 hash of refreshToken in `prisma.refreshToken` with familyId, userAgent, ip, expiresAt.
 * 7. Update user `lastLoginAt = new Date()`.
 * 8. Return { user, accessToken, refreshToken }.
 */
export async function loginUser(_params) {
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: loginUser');
}

/**
 * Refreshes an expired access token using Refresh Token Rotation (RTR).
 *
 * @param {object} params
 * @param {string} params.refreshToken - Raw refresh token from cookie or body.
 * @param {string} [params.userAgent] - Client User-Agent header.
 * @param {string} [params.ipAddress] - Client IP address.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 *
 * Specification for student implementation:
 * 1. Verify token signature and expiration with `verifyRefreshToken(refreshToken)`.
 *    - On failure, throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token').
 * 2. Hash incoming token with SHA-256 and look up in `prisma.refreshToken`.
 * 3. If token record is missing:
 *    - Throw new AppError(401, 'UNAUTHORIZED', 'Refresh token not recognized').
 * 4. Reuse Detection (Security Critical):
 *    - If token was already revoked (`revokedAt !== null`) or already replaced (`replacedById !== null`):
 *      - An attacker may be reusing an old token!
 *      - Revoke all tokens belonging to this `familyId` in `prisma.refreshToken`.
 *      - Throw new AppError(401, 'TOKEN_REUSE_DETECTED', 'Session terminated due to security violation').
 * 5. If token is valid and unrevoked:
 *    - Generate new accessToken.
 *    - Generate new refreshToken for the same `familyId`.
 *    - In a database transaction:
 *      a. Insert new refresh token record with same `familyId`.
 *      b. Mark current token record as replaced (`replacedById = newToken.id`, `revokedAt = new Date()`).
 *    - Return { user, accessToken, refreshToken: newRefreshToken }.
 */
export async function refreshSession(_params) {
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: refreshSession');
}

/**
 * Revokes a refresh token session upon user logout.
 *
 * @param {object} params
 * @param {string} params.refreshToken - Raw refresh token to revoke.
 * @returns {Promise<void>}
 *
 * Specification for student implementation:
 * 1. If refreshToken is provided:
 *    - Hash token with SHA-256.
 *    - Update matching record in `prisma.refreshToken` setting `revokedAt = new Date()`.
 */
export async function logoutUser(_params) {
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: logoutUser');
}

/**
 * Retrieves the current authenticated user profile.
 *
 * @param {string} _userId - User ID from authenticated token.
 * @returns {Promise<object>} User entity without sensitive credentials.
 *
 * Specification for student implementation:
 * 1. Find user by `_userId` in `prisma.user`.
 * 2. If not found or status !== 'ACTIVE', throw new AppError(404, 'NOT_FOUND', 'User not found').
 * 3. Return sanitized user profile (id, email, fullName, phone, role, status, avatarUrl).
 */
export async function getCurrentUser(_userId) {
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: getCurrentUser');
}
