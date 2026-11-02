import { prisma } from '@cinehub/db';

export function findLatestEmailVerificationToken(userId) {
  return prisma.emailVerificationToken.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
}

export function replaceEmailVerificationTokens({ userId, tokenHash, expiresAt }) {
  return prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);
}

export function createRefreshToken(data, db = prisma) {
  return db.refreshToken.create({ data });
}

export function findUserByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id) {
  return prisma.user.findUnique({ where: { id } });
}

export function findUserByGoogleId(googleId) {
  return prisma.user.findUnique({ where: { googleId } });
}

export function createUser(data) {
  return prisma.user.create({ data });
}

export function updateUser(id, data, db = prisma) {
  return db.user.update({ where: { id }, data });
}

export function findValidEmailVerificationToken({ userId, tokenHash, now }) {
  return prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });
}

export function claimEmailVerificationAndActivateUser({ tokenId, userId, now, onAlreadyClaimed }) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.emailVerificationToken.updateMany({
      where: { id: tokenId, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count === 0) throw onAlreadyClaimed();
    return tx.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: now, lastLoginAt: now },
    });
  });
}

export function findRefreshTokenWithUser(tokenHash) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export function revokeRefreshTokenFamily(familyId, revokedAt = new Date()) {
  return prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt },
  });
}

export function rotateRefreshTokenInTransaction(callback) {
  return prisma.$transaction(callback);
}

export function claimRefreshTokenForRotation(tx, { id, replacedById, revokedAt }) {
  return tx.refreshToken.updateMany({
    where: { id, revokedAt: null, replacedById: null },
    data: { replacedById, revokedAt },
  });
}

export function revokeRefreshTokenByHash(tokenHash, revokedAt = new Date()) {
  return prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt },
  });
}

export function findLatestPasswordResetToken(userId) {
  return prisma.passwordResetToken.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
}

export function replacePasswordResetTokens({ userId, tokenHash, expiresAt }) {
  return prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);
}

export function findValidPasswordResetToken({ tokenHash, now }) {
  return prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    include: { user: true },
  });
}

export function consumePasswordResetAndRevokeSessions({
  recordId,
  userId,
  passwordHash,
  emailVerifiedAt,
  now,
  onAlreadyClaimed,
}) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: recordId, usedAt: null },
      data: { usedAt: now },
    });
    if (claimed.count === 0) throw onAlreadyClaimed();

    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        ...(emailVerifiedAt ? {} : { emailVerifiedAt: now }),
      },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: now },
    });
    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
}
