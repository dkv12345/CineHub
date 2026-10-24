import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, mailer, googleOAuth } = vi.hoisted(() => {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  });
  const db = {
    user: model(),
    emailVerificationToken: model(),
    passwordResetToken: model(),
    refreshToken: model(),
  };
  db.$transaction = vi.fn((arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(db)));
  return {
    prisma: db,
    mailer: {
      sendVerificationEmail: vi.fn(),
      sendWelcomeNotification: vi.fn(),
      sendResetPasswordNotification: vi.fn(),
      sendResetSuccessNotification: vi.fn(),
    },
    googleOAuth: {
      verifyGoogleIdToken: vi.fn(),
    },
  };
});

vi.mock('@cinehub/db', () => ({ prisma }));
vi.mock('../src/lib/mailer.js', () => mailer);
vi.mock('../src/lib/googleOAuth.js', () => googleOAuth);

const bcrypt = (await import('bcryptjs')).default;
const { hashToken, generateRefreshToken, verifyAccessToken } = await import('../src/lib/jwt.js');
const service = await import('../src/modules/auth/auth.service.js');

/** E-mails are dispatched fire-and-forget, so let queued microtasks run before asserting. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const baseUser = {
  id: USER_ID,
  email: 'an@example.com',
  fullName: 'Nguyễn Văn An',
  phone: null,
  role: 'CUSTOMER',
  status: 'ACTIVE',
  authProvider: 'LOCAL',
  avatarUrl: null,
  passwordHash: bcrypt.hashSync('Password123', 4),
  emailVerifiedAt: new Date(),
  deletedAt: null,
};

const rejection = async (promise) =>
  promise.then(
    () => null,
    (error) => error,
  );

beforeEach(() => {
  vi.clearAllMocks();
  prisma.emailVerificationToken.findFirst.mockResolvedValue(null);
  prisma.passwordResetToken.findFirst.mockResolvedValue(null);
  prisma.refreshToken.create.mockResolvedValue({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' });
  prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  prisma.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
  prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
});

describe('registerUser', () => {
  it('stores a salted OTP hash, e-mails the code and never exposes the password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({
      ...baseUser,
      emailVerifiedAt: null,
      ...data,
      id: USER_ID,
    }));

    const { user } = await service.registerUser({
      email: 'AN@example.com',
      password: 'Password123',
      fullName: 'Nguyễn Văn An',
    });
    await flush();

    expect(user).not.toHaveProperty('passwordHash');
    expect(user).toMatchObject({ email: 'an@example.com', emailVerified: false });
    expect(prisma.user.create.mock.calls[0][0].data.passwordHash).not.toBe('Password123');

    const { otp } = mailer.sendVerificationEmail.mock.calls[0][0];
    expect(otp).toMatch(/^\d{6}$/);
    expect(prisma.emailVerificationToken.create.mock.calls[0][0].data.tokenHash).toBe(
      hashToken(`${USER_ID}:${otp}`),
    );
  });

  it('rejects an e-mail that already belongs to a verified account', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    const error = await rejection(
      service.registerUser({ email: baseUser.email, password: 'Password123', fullName: 'X Y' }),
    );
    expect(error).toMatchObject({ status: 409, code: 'CONFLICT' });
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
  });
});

describe('loginUser', () => {
  it('returns the same error for unknown e-mail and wrong password', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await rejection(
      service.loginUser({ email: 'nobody@example.com', password: 'Password123' }),
    );

    prisma.user.findUnique.mockResolvedValueOnce(baseUser);
    const wrong = await rejection(
      service.loginUser({ email: baseUser.email, password: 'WrongPassword1' }),
    );

    expect(unknown).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(wrong).toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('blocks unverified accounts with EMAIL_NOT_VERIFIED and sends a fresh OTP', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, emailVerifiedAt: null });

    const error = await rejection(
      service.loginUser({ email: baseUser.email, password: 'Password123' }),
    );
    await flush();

    expect(error).toMatchObject({ status: 403, code: 'EMAIL_NOT_VERIFIED' });
    expect(error.details).toEqual({ email: baseUser.email });
    expect(mailer.sendVerificationEmail).toHaveBeenCalledOnce();
  });

  it('issues a verifiable access token and persists only the refresh token hash', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);
    prisma.user.update.mockResolvedValue(baseUser);

    const result = await service.loginUser({
      email: baseUser.email,
      password: 'Password123',
      userAgent: 'vitest',
      ipAddress: '127.0.0.1',
    });

    expect(verifyAccessToken(result.accessToken)).toMatchObject({
      sub: USER_ID,
      role: 'CUSTOMER',
      email: baseUser.email,
    });
    const stored = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(hashToken(result.refreshToken));
    expect(stored.tokenHash).toHaveLength(64);
    expect(result.user).not.toHaveProperty('passwordHash');
  });
});

describe('verifyEmail', () => {
  it('rejects an unknown or expired code', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...baseUser, emailVerifiedAt: null });
    const error = await rejection(service.verifyEmail({ email: baseUser.email, code: '123456' }));
    expect(error).toMatchObject({ status: 400, code: 'INVALID_CODE' });
  });

  it('activates the account, signs the user in and sends the welcome e-mail', async () => {
    const unverified = { ...baseUser, emailVerifiedAt: null };
    prisma.user.findUnique.mockResolvedValue(unverified);
    prisma.emailVerificationToken.findFirst.mockResolvedValue({ id: 'tok-1' });
    prisma.user.update.mockResolvedValue({ ...unverified, emailVerifiedAt: new Date() });

    const result = await service.verifyEmail({ email: baseUser.email, code: '123456' });
    await flush();

    expect(prisma.emailVerificationToken.findFirst.mock.calls[0][0].where.tokenHash).toBe(
      hashToken(`${USER_ID}:123456`),
    );
    expect(result.user.emailVerified).toBe(true);
    expect(result.accessToken).toBeTruthy();
    expect(mailer.sendWelcomeNotification).toHaveBeenCalledWith({
      to: baseUser.email,
      fullName: baseUser.fullName,
    });
  });
});

describe('forgotPassword', () => {
  const generic = { message: 'If an account exists, a reset link has been dispatched' };

  it('answers identically and sends nothing for unknown accounts', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await service.forgotPassword({ email: 'nobody@example.com' })).toEqual(generic);
    await flush();
    expect(mailer.sendResetPasswordNotification).not.toHaveBeenCalled();
  });

  it('stores only the token hash and e-mails the plain token', async () => {
    prisma.user.findUnique.mockResolvedValue(baseUser);

    expect(await service.forgotPassword({ email: baseUser.email })).toEqual(generic);
    await flush();

    const { resetToken } = mailer.sendResetPasswordNotification.mock.calls[0][0];
    expect(resetToken).toHaveLength(64);
    expect(prisma.passwordResetToken.create.mock.calls[0][0].data.tokenHash).toBe(
      hashToken(resetToken),
    );
  });
});

describe('resetPassword', () => {
  it('rejects invalid or expired tokens', async () => {
    prisma.passwordResetToken.findFirst.mockResolvedValue(null);
    const error = await rejection(
      service.resetPassword({ token: 'nope', newPassword: 'NewPassword123' }),
    );
    expect(error).toMatchObject({ status: 400, code: 'INVALID_TOKEN' });
  });

  it('updates the password, revokes every session and sends the confirmation e-mail', async () => {
    prisma.passwordResetToken.findFirst.mockResolvedValue({
      id: 'reset-1',
      userId: USER_ID,
      user: baseUser,
    });
    prisma.user.update.mockResolvedValue(baseUser);

    await service.resetPassword({ token: 'plain-token', newPassword: 'NewPassword123' });
    await flush();

    const { passwordHash } = prisma.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('NewPassword123', passwordHash)).toBe(true);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID, revokedAt: null } }),
    );
    expect(mailer.sendResetSuccessNotification).toHaveBeenCalledWith({
      to: baseUser.email,
      fullName: baseUser.fullName,
    });
  });
});

describe('refreshSession', () => {
  it('revokes the whole token family when a rotated token is replayed', async () => {
    const token = generateRefreshToken({ sub: USER_ID, familyId: 'family-1' });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'old',
      familyId: 'family-1',
      replacedById: 'newer',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: baseUser,
    });

    const error = await rejection(service.refreshSession({ refreshToken: token }));

    expect(error).toMatchObject({ status: 401, code: 'TOKEN_REUSE_DETECTED' });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { familyId: 'family-1', revokedAt: null } }),
    );
  });

  it('rotates a valid token within the same family', async () => {
    const token = generateRefreshToken({ sub: USER_ID, familyId: 'family-1' });
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'current',
      familyId: 'family-1',
      replacedById: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      user: baseUser,
    });

    const result = await service.refreshSession({ refreshToken: token });

    expect(result.refreshToken).not.toBe(token);
    expect(prisma.refreshToken.create.mock.calls[0][0].data.familyId).toBe('family-1');
    expect(prisma.refreshToken.updateMany.mock.calls[0][0].data).toMatchObject({
      replacedById: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
  });

  it('rejects a malformed token without touching the database', async () => {
    const error = await rejection(service.refreshSession({ refreshToken: 'garbage' }));
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
  });
});

describe('loginWithGoogle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.refreshToken.create.mockResolvedValue({ id: 'token-uuid' });
    prisma.user.update.mockImplementation(({ data }) => Promise.resolve({ ...baseUser, ...data }));
  });

  it('creates a new account and queues welcome notification for brand new Google user', async () => {
    googleOAuth.verifyGoogleIdToken.mockResolvedValue({
      googleId: 'google-sub-123',
      email: 'newuser@example.com',
      name: 'Google User',
      picture: 'https://lh3.googleusercontent.com/avatar',
      emailVerified: true,
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      ...baseUser,
      id: 'brand-new-id',
      email: 'newuser@example.com',
      fullName: 'Google User',
      googleId: 'google-sub-123',
      authProvider: 'GOOGLE',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar',
    });

    const result = await service.loginWithGoogle({
      idToken: 'valid-google-id-token',
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
    });

    expect(result.user.email).toBe('newuser@example.com');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleId: 'google-sub-123',
          authProvider: 'GOOGLE',
        }),
      }),
    );
    await flush();
    expect(mailer.sendWelcomeNotification).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'newuser@example.com' }),
    );
  });

  it('merges account when user exists by email without googleId', async () => {
    googleOAuth.verifyGoogleIdToken.mockResolvedValue({
      googleId: 'google-sub-456',
      email: 'an@example.com',
      name: 'Nguyễn Văn An',
      picture: null,
      emailVerified: true,
    });
    // First findUnique by googleId returns null, second by email returns baseUser
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...baseUser, googleId: null });

    const result = await service.loginWithGoogle({ idToken: 'valid-token' });

    expect(result.user.id).toBe(USER_ID);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({ googleId: 'google-sub-456' }),
      }),
    );
  });
});
