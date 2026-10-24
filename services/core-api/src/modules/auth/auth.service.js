import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@cinehub/db';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import {
  REFRESH_TOKEN_TTL_MS,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../../lib/jwt.js';
import {
  sendResetPasswordNotification,
  sendResetSuccessNotification,
  sendVerificationEmail,
  sendWelcomeNotification,
} from '../../lib/mailer.js';
import { verifyGoogleIdToken } from '../../lib/googleOAuth.js';

const BCRYPT_COST = 10;
const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;
const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;

/**
 * Hash compared against when the account does not exist, so that "unknown email" and
 * "wrong password" take the same time and cannot be told apart by timing.
 */
const TIMING_EQUALIZER_HASH = bcrypt.hashSync('cinehub-timing-equalizer', BCRYPT_COST);

const normalizeEmail = (email) => String(email).trim().toLowerCase();
const isLoginable = (user) => user.status === 'ACTIVE' && !user.deletedAt;

/**
 * Removes credentials and internal columns before a user leaves the service layer.
 */
function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    authProvider: user.authProvider,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

/**
 * Fire-and-forget email dispatch. Responses never wait on the SMTP round-trip, which also
 * keeps response times identical for existing and non-existing accounts.
 */
function queueEmail(label, promiseFactory) {
  Promise.resolve()
    .then(promiseFactory)
    .catch((error) => logger.error(`[Auth] Failed to dispatch ${label} email: ${error.message}`));
}

/**
 * The OTP space is only 10^6, so the stored hash is salted with the user id. This keeps the
 * `tokenHash` unique constraint collision-free across users who happen to receive the same code.
 */
const hashOtp = (userId, otp) => hashToken(`${userId}:${otp}`);

async function assertOtpCooldown(userId) {
  const latest = await prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (!latest) return;
  const elapsed = Date.now() - latest.createdAt.getTime();
  if (elapsed < OTP_RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
    throw new AppError(
      429,
      'OTP_COOLDOWN',
      `Please wait ${retryAfterSeconds}s before requesting another code`,
      { retryAfterSeconds },
    );
  }
}

/**
 * Generates a fresh 6-digit OTP (invalidating older ones) and e-mails it to the user.
 */
async function issueEmailOtp(user) {
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashOtp(user.id, otp),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);
  queueEmail('verification', () =>
    sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      otp,
      expiresInMinutes: OTP_TTL_MINUTES,
    }),
  );
}

/**
 * Creates an access/refresh token pair and persists the hashed refresh token.
 *
 * @param {object} user
 * @param {{ userAgent?: string, ipAddress?: string, familyId?: string }} meta
 * @param {import('@prisma/client').Prisma.TransactionClient} [db]
 */
async function issueSession(user, { userAgent, ipAddress, familyId } = {}, db = prisma) {
  const sessionFamilyId = familyId ?? crypto.randomUUID();
  const accessToken = generateAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = generateRefreshToken({ sub: user.id, familyId: sessionFamilyId });

  const record = await db.refreshToken.create({
    data: {
      userId: user.id,
      familyId: sessionFamilyId,
      tokenHash: hashToken(refreshToken),
      userAgent: userAgent ? userAgent.slice(0, 255) : null,
      ip: ipAddress ? ipAddress.slice(0, 45) : null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return { accessToken, refreshToken, tokenId: record.id };
}

/**
 * Registers a new user account and sends the e-mail verification OTP.
 *
 * No session is issued here: the account must prove ownership of the e-mail address
 * through `verifyEmail` first.
 *
 * @param {object} params
 * @param {string} params.email - User email address.
 * @param {string} params.password - Plaintext password.
 * @param {string} params.fullName - Full display name.
 * @param {string} [params.phone] - Contact phone number.
 * @returns {Promise<{ user: object }>} Created user entity (without passwordHash).
 */
export async function registerUser({ email, password, fullName, phone }) {
  const normalizedEmail = normalizeEmail(email);
  const conflict = () => new AppError(409, 'CONFLICT', 'Email already registered');

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // A verified (or Google / disabled) account owns the address. An abandoned, still-unverified
  // sign-up must not lock the address forever, so it is re-claimed instead.
  if (
    existing &&
    (existing.emailVerifiedAt || existing.authProvider !== 'LOCAL' || !isLoginable(existing))
  ) {
    throw conflict();
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  let user;

  if (existing) {
    await assertOtpCooldown(existing.id);
    user = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, fullName, phone: phone ?? null },
    });
  } else {
    try {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName,
          phone: phone ?? null,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });
    } catch (error) {
      if (error?.code === 'P2002') throw conflict(); // concurrent sign-up with the same email
      throw error;
    }
  }

  await issueEmailOtp(user);
  return { user: sanitizeUser(user) };
}

/**
 * Confirms the e-mail OTP, activates the account, sends the welcome e-mail and signs the user in.
 *
 * @param {object} params
 * @param {string} params.email - Account email.
 * @param {string} params.code - 6-digit OTP from the e-mail.
 * @param {string} [params.userAgent] - Client User-Agent header.
 * @param {string} [params.ipAddress] - Client IP address.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export async function verifyEmail({ email, code, userAgent, ipAddress }) {
  const invalid = () =>
    new AppError(400, 'INVALID_CODE', 'Verification code is invalid or has expired');

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !isLoginable(user)) throw invalid();
  if (user.emailVerifiedAt) {
    throw new AppError(409, 'ALREADY_VERIFIED', 'Email has already been verified');
  }

  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      userId: user.id,
      tokenHash: hashOtp(user.id, code),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!record) throw invalid();

  const now = new Date();
  const verifiedUser = await prisma.$transaction(async (tx) => {
    const claimed = await tx.emailVerificationToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count === 0) throw invalid(); // consumed by a concurrent request
    return tx.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: now, lastLoginAt: now },
    });
  });

  const session = await issueSession(verifiedUser, { userAgent, ipAddress });
  queueEmail('welcome', () =>
    sendWelcomeNotification({ to: verifiedUser.email, fullName: verifiedUser.fullName }),
  );

  return {
    user: sanitizeUser(verifiedUser),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

/**
 * Sends a new verification OTP to an account that has not verified its e-mail yet.
 *
 * Always resolves with the same message so the endpoint cannot be used to discover
 * which e-mail addresses are registered.
 *
 * @param {object} params
 * @param {string} params.email - Account email.
 * @returns {Promise<{ message: string }>}
 */
export async function resendVerification({ email }) {
  const message = 'If the account is pending verification, a new code has been sent';
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

  if (!user || user.emailVerifiedAt || user.authProvider !== 'LOCAL' || !isLoginable(user)) {
    return { message };
  }

  try {
    await assertOtpCooldown(user.id);
  } catch (error) {
    if (error instanceof AppError && error.code === 'OTP_COOLDOWN') return { message };
    throw error;
  }

  await issueEmailOtp(user);
  return { message };
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
 */
export async function loginUser({ email, password, userAgent, ipAddress }) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });

  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? TIMING_EQUALIZER_HASH,
  );
  if (!user || !user.passwordHash || !passwordMatches || !isLoginable(user)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Only reveal the "not verified" state once the password is proven correct.
  if (!user.emailVerifiedAt) {
    try {
      await assertOtpCooldown(user.id);
      await issueEmailOtp(user);
    } catch (error) {
      if (!(error instanceof AppError && error.code === 'OTP_COOLDOWN')) throw error;
    }
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email address first', {
      email: user.email,
    });
  }

  const loggedInUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  const session = await issueSession(loggedInUser, { userAgent, ipAddress });

  return {
    user: sanitizeUser(loggedInUser),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

/**
 * Refreshes an expired access token using Refresh Token Rotation (RTR).
 *
 * Presenting a refresh token that was already rotated or revoked is treated as theft:
 * the whole token family (every session descending from the same login) is revoked.
 *
 * @param {object} params
 * @param {string} params.refreshToken - Raw refresh token from cookie or body.
 * @param {string} [params.userAgent] - Client User-Agent header.
 * @param {string} [params.ipAddress] - Client IP address.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 */
export async function refreshSession({ refreshToken, userAgent, ipAddress }) {
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });
  if (!record) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token not recognized');
  }

  const revokeFamily = () =>
    prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  const reuseDetected = () =>
    new AppError(401, 'TOKEN_REUSE_DETECTED', 'Session terminated due to security violation');

  if (record.revokedAt || record.replacedById) {
    await revokeFamily();
    throw reuseDetected();
  }
  if (record.expiresAt <= new Date()) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }
  if (!isLoginable(record.user) || !record.user.emailVerifiedAt) {
    await revokeFamily();
    throw new AppError(401, 'UNAUTHORIZED', 'Account is not allowed to refresh sessions');
  }

  const rotationConflict = new Error('refresh token already rotated');
  try {
    const session = await prisma.$transaction(async (tx) => {
      const next = await issueSession(
        record.user,
        { userAgent, ipAddress, familyId: record.familyId },
        tx,
      );
      // Conditional update: if a concurrent request already rotated this token, count is 0.
      const claimed = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null, replacedById: null },
        data: { replacedById: next.tokenId, revokedAt: new Date() },
      });
      if (claimed.count === 0) throw rotationConflict;
      return next;
    });

    return {
      user: sanitizeUser(record.user),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };
  } catch (error) {
    if (error === rotationConflict) {
      await revokeFamily();
      throw reuseDetected();
    }
    throw error;
  }
}

/**
 * Revokes a refresh token session upon user logout.
 *
 * @param {object} params
 * @param {string} [params.refreshToken] - Raw refresh token to revoke.
 * @returns {Promise<void>}
 */
export async function logoutUser({ refreshToken }) {
  if (!refreshToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Retrieves the current authenticated user profile.
 *
 * @param {string} userId - User ID from authenticated token.
 * @returns {Promise<object>} User entity without sensitive credentials.
 */
export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !isLoginable(user)) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return sanitizeUser(user);
}

/**
 * Authenticates user via Google OAuth ID Token (One Tap / Sign-In).
 *
 * @param {object} params
 * @param {string} params.idToken - Google credential ID token from client.
 * @param {string} [params.userAgent] - Client User-Agent header.
 * @param {string} [params.ipAddress] - Client IP address.
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string }>}
 *
 * Specification for student implementation:
 * 1. Verify `idToken` using `verifyGoogleIdToken(idToken)` from `../../lib/googleOAuth.js`.
 * 2. Query user by `googleId` in `prisma.user`.
 * 3. Account Merging:
 *    - If no user matches `googleId`, query by `email`.
 *    - If user exists with same email, link Google account:
 *      Update user setting `googleId = payload.googleId`, `emailVerifiedAt = new Date()`,
 *      and populate `avatarUrl` if not already set.
 * 4. Account Creation:
 *    - If no user exists by `googleId` or `email`, insert new user:
 *      { email, fullName: name, googleId, authProvider: 'GOOGLE', avatarUrl: picture, emailVerifiedAt: new Date(), passwordHash: null }
 * 5. Generate accessToken and refreshToken pair (with new `familyId`).
 * 6. Store SHA-256 hash in `prisma.refreshToken`.
 * 7. Update `lastLoginAt = new Date()`.
 * 8. Return { user, accessToken, refreshToken }.
 */
export async function loginWithGoogle({ idToken, userAgent, ipAddress }) {
  const payload = await verifyGoogleIdToken(idToken);
  const normalizedEmail = normalizeEmail(payload.email);

  let user = await prisma.user.findUnique({
    where: { googleId: payload.googleId },
  });

  if (user) {
    if (!isLoginable(user)) {
      throw new AppError(403, 'FORBIDDEN', 'Tài khoản của bạn đã bị khoá hoặc ngưng hoạt động');
    }
  } else {
    // Account merging: check if user exists by email
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      if (!isLoginable(user)) {
        throw new AppError(403, 'FORBIDDEN', 'Tài khoản của bạn đã bị khoá hoặc ngưng hoạt động');
      }

      // Link googleId to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: payload.googleId,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          avatarUrl: user.avatarUrl || payload.picture,
        },
      });
    } else {
      // Account creation for brand-new Google user
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          fullName: payload.name,
          googleId: payload.googleId,
          authProvider: 'GOOGLE',
          avatarUrl: payload.picture,
          emailVerifiedAt: new Date(),
          passwordHash: null,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        },
      });

      queueEmail('welcome', () =>
        sendWelcomeNotification({
          to: user.email,
          fullName: user.fullName,
        }),
      );
    }
  }

  // Issue session and update lastLoginAt
  const session = await issueSession(user, { userAgent, ipAddress });
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: sanitizeUser(user),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

/**
 * Initiates password reset workflow by generating and storing a reset token, then e-mailing the link.
 *
 * Always resolves with the same message (unknown account, locked account, or throttled request)
 * to prevent account enumeration.
 *
 * @param {object} params
 * @param {string} params.email - User email address.
 * @returns {Promise<{ message: string }>} Status confirmation.
 */
export async function forgotPassword({ email }) {
  const result = { message: 'If an account exists, a reset link has been dispatched' };

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !isLoginable(user)) return result;

  const latest = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < RESET_REQUEST_COOLDOWN_MS) {
    return result;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(resetToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  queueEmail('password reset', () =>
    sendResetPasswordNotification({ to: user.email, fullName: user.fullName, resetToken }),
  );
  return result;
}

/**
 * Completes password reset workflow using verification token.
 *
 * @param {object} params
 * @param {string} params.token - Plain reset token from email link.
 * @param {string} params.newPassword - New plaintext password.
 * @returns {Promise<{ message: string }>} Confirmation.
 */
export async function resetPassword({ token, newPassword }) {
  const invalid = () => new AppError(400, 'INVALID_TOKEN', 'Reset token is invalid or expired');

  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!record || !isLoginable(record.user)) throw invalid();

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count === 0) throw invalid(); // consumed by a concurrent request

    await tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        // Receiving the reset link proves ownership of the mailbox.
        ...(record.user.emailVerifiedAt ? {} : { emailVerifiedAt: now }),
      },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });
    await tx.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    });
  });

  queueEmail('password reset success', () =>
    sendResetSuccessNotification({ to: record.user.email, fullName: record.user.fullName }),
  );
  return { message: 'Password updated successfully' };
}
