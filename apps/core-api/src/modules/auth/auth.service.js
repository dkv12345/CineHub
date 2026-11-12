import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../../platform/utils/errors.js';
import { env } from '../../platform/config/env.js';
import { logger } from '../../platform/observability/logger.js';
import {
  REFRESH_TOKEN_TTL_MS,
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from '../../platform/security/jwt.js';
import {
  sendResetPasswordNotification,
  sendResetSuccessNotification,
  sendVerificationEmail,
  sendWelcomeNotification,
} from '../../platform/mail/mailer.js';
import { verifyGoogleIdToken } from '../../platform/security/googleOAuth.js';
import * as authRepository from './auth.repository.js';

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
  const latest = await authRepository.findLatestEmailVerificationToken(userId);
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
  await authRepository.replaceEmailVerificationTokens({
    userId: user.id,
    tokenHash: hashOtp(user.id, otp),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });
  queueEmail('verification', () =>
    sendVerificationEmail({
      to: user.email,
      fullName: user.fullName,
      otp,
      expiresInMinutes: OTP_TTL_MINUTES,
    }),
  );
  return otp;
}

/**
 * Creates an access/refresh token pair and persists the hashed refresh token.
 *
 * @param {object} user
 * @param {{ userAgent?: string, ipAddress?: string, familyId?: string }} meta
 * @param {import('@prisma/client').Prisma.TransactionClient} [db]
 */
async function issueSession(user, { userAgent, ipAddress, familyId } = {}, db) {
  const sessionFamilyId = familyId ?? crypto.randomUUID();
  const accessToken = generateAccessToken({ sub: user.id, role: user.role, email: user.email });
  const refreshToken = generateRefreshToken({ sub: user.id, familyId: sessionFamilyId });

  const record = await authRepository.createRefreshToken(
    {
      userId: user.id,
      familyId: sessionFamilyId,
      tokenHash: hashToken(refreshToken),
      userAgent: userAgent ? userAgent.slice(0, 255) : null,
      ip: ipAddress ? ipAddress.slice(0, 45) : null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
    db,
  );

  return { accessToken, refreshToken, tokenId: record.id };
}

/**
 * Registers a new user account and sends the e-mail verification OTP.
 */
export async function registerUser({ email, password, fullName, phone }) {
  const normalizedEmail = normalizeEmail(email);
  const conflict = () => new AppError(409, 'CONFLICT', 'Email already registered');

  const existing = await authRepository.findUserByEmail(normalizedEmail);

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
    user = await authRepository.updateUser(existing.id, {
      passwordHash,
      fullName,
      phone: phone ?? null,
    });
  } else {
    try {
      user = await authRepository.createUser({
        email: normalizedEmail,
        passwordHash,
        fullName,
        phone: phone ?? null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });
    } catch (error) {
      if (error?.code === 'P2002') throw conflict();
      throw error;
    }
  }

  const otp = await issueEmailOtp(user);
  const exposeDevOtp = env.NODE_ENV === 'development' && (!env.SMTP_USER || !env.SMTP_PASS);
  return { user: sanitizeUser(user), ...(exposeDevOtp ? { devOtp: otp } : {}) };
}

/**
 * Confirms the e-mail OTP, activates the account, sends the welcome e-mail and signs the user in.
 */
export async function verifyEmail({ email, code, userAgent, ipAddress }) {
  const invalid = () =>
    new AppError(400, 'INVALID_CODE', 'Verification code is invalid or has expired');

  const user = await authRepository.findUserByEmail(normalizeEmail(email));
  if (!user || !isLoginable(user)) throw invalid();
  if (user.emailVerifiedAt) {
    throw new AppError(409, 'ALREADY_VERIFIED', 'Email has already been verified');
  }

  const record = await authRepository.findValidEmailVerificationToken({
    userId: user.id,
    tokenHash: hashOtp(user.id, code),
    now: new Date(),
  });
  if (!record) throw invalid();

  const now = new Date();
  const verifiedUser = await authRepository.claimEmailVerificationAndActivateUser({
    tokenId: record.id,
    userId: user.id,
    now,
    onAlreadyClaimed: invalid,
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
 */
export async function resendVerification({ email }) {
  const message = 'If the account is pending verification, a new code has been sent';
  const user = await authRepository.findUserByEmail(normalizeEmail(email));

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
 */
export async function loginUser({ email, password, userAgent, ipAddress }) {
  const user = await authRepository.findUserByEmail(normalizeEmail(email));

  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? TIMING_EQUALIZER_HASH,
  );
  if (!user || !user.passwordHash || !passwordMatches || !isLoginable(user)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

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

  const loggedInUser = await authRepository.updateUser(user.id, { lastLoginAt: new Date() });
  const session = await issueSession(loggedInUser, { userAgent, ipAddress });

  return {
    user: sanitizeUser(loggedInUser),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

/**
 * Refreshes an expired access token using Refresh Token Rotation (RTR).
 */
export async function refreshSession({ refreshToken, userAgent, ipAddress }) {
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
  }

  const record = await authRepository.findRefreshTokenWithUser(hashToken(refreshToken));
  if (!record) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token not recognized');
  }

  const revokeFamily = () => authRepository.revokeRefreshTokenFamily(record.familyId, new Date());
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
    const session = await authRepository.rotateRefreshTokenInTransaction(async (tx) => {
      const next = await issueSession(
        record.user,
        { userAgent, ipAddress, familyId: record.familyId },
        tx,
      );
      const claimed = await authRepository.claimRefreshTokenForRotation(tx, {
        id: record.id,
        replacedById: next.tokenId,
        revokedAt: new Date(),
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
 */
export async function logoutUser({ refreshToken }) {
  if (!refreshToken) return;
  await authRepository.revokeRefreshTokenByHash(hashToken(refreshToken), new Date());
}

/**
 * Retrieves the current authenticated user profile.
 */
export async function getCurrentUser(userId) {
  const user = await authRepository.findUserById(userId);
  if (!user || !isLoginable(user)) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }
  return sanitizeUser(user);
}

/**
 * Authenticates user via Google OAuth ID Token (One Tap / Sign-In).
 */
export async function loginWithGoogle({ idToken, userAgent, ipAddress }) {
  const payload = await verifyGoogleIdToken(idToken);
  const normalizedEmail = normalizeEmail(payload.email);

  let user = await authRepository.findUserByGoogleId(payload.googleId);

  if (user) {
    if (!isLoginable(user)) {
      throw new AppError(403, 'FORBIDDEN', 'Tài khoản của bạn đã bị khoá hoặc ngưng hoạt động');
    }
  } else {
    user = await authRepository.findUserByEmail(normalizedEmail);

    if (user) {
      if (!isLoginable(user)) {
        throw new AppError(403, 'FORBIDDEN', 'Tài khoản của bạn đã bị khoá hoặc ngưng hoạt động');
      }

      user = await authRepository.updateUser(user.id, {
        googleId: payload.googleId,
        emailVerifiedAt: user.emailVerifiedAt || new Date(),
        avatarUrl: user.avatarUrl || payload.picture,
      });
    } else {
      user = await authRepository.createUser({
        email: normalizedEmail,
        fullName: payload.name,
        googleId: payload.googleId,
        authProvider: 'GOOGLE',
        avatarUrl: payload.picture,
        emailVerifiedAt: new Date(),
        passwordHash: null,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });

      queueEmail('welcome', () =>
        sendWelcomeNotification({
          to: user.email,
          fullName: user.fullName,
        }),
      );
    }
  }

  const session = await issueSession(user, { userAgent, ipAddress });
  await authRepository.updateUser(user.id, { lastLoginAt: new Date() });

  return {
    user: sanitizeUser(user),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  };
}

/**
 * Initiates password reset workflow by generating and storing a reset token, then e-mailing the link.
 */
export async function forgotPassword({ email }) {
  const result = { message: 'If an account exists, a reset link has been dispatched' };

  const user = await authRepository.findUserByEmail(normalizeEmail(email));
  if (!user || !isLoginable(user)) return result;

  const latest = await authRepository.findLatestPasswordResetToken(user.id);
  if (latest && Date.now() - latest.createdAt.getTime() < RESET_REQUEST_COOLDOWN_MS) {
    return result;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  await authRepository.replacePasswordResetTokens({
    userId: user.id,
    tokenHash: hashToken(resetToken),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  queueEmail('password reset', () =>
    sendResetPasswordNotification({ to: user.email, fullName: user.fullName, resetToken }),
  );
  return result;
}

/**
 * Completes password reset workflow using verification token.
 */
export async function resetPassword({ token, newPassword }) {
  const invalid = () => new AppError(400, 'INVALID_TOKEN', 'Reset token is invalid or expired');

  const record = await authRepository.findValidPasswordResetToken({
    tokenHash: hashToken(token),
    now: new Date(),
  });
  if (!record || !isLoginable(record.user)) throw invalid();

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  const now = new Date();

  await authRepository.consumePasswordResetAndRevokeSessions({
    recordId: record.id,
    userId: record.userId,
    passwordHash,
    emailVerifiedAt: record.user.emailVerifiedAt,
    now,
    onAlreadyClaimed: invalid,
  });

  queueEmail('password reset success', () =>
    sendResetSuccessNotification({ to: record.user.email, fullName: record.user.fullName }),
  );
  return { message: 'Password updated successfully' };
}
