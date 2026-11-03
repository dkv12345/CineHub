import { z } from 'zod';

/**
 * Validation schema for user registration.
 */
export const registerSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password is too long'),
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(120, 'Full name is too long'),
    phone: z
      .string()
      .trim()
      .regex(/^(0|\+84)[0-9]{9,10}$/, 'Invalid phone number format')
      .optional(),
  }),
});

/**
 * Validation schema for confirming the e-mail verification OTP.
 */
export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Verification code must be 6 digits'),
  }),
});

/**
 * Validation schema for requesting a new verification OTP.
 */
export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
  }),
});

/**
 * Validation schema for user login.
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Validation schema for refreshing authentication tokens.
 * Refresh token can be delivered in request body or via HTTP-only cookie.
 */
export const refreshTokenSchema = z.object({
  body: z
    .object({
      refreshToken: z.string().optional(),
    })
    .optional(),
});

/**
 * Validation schema for Google OAuth authentication.
 */
export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
  }),
});

/**
 * Validation schema for requesting password reset.
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
  }),
});

/**
 * Validation schema for resetting password with a verification token.
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password is too long'),
  }),
});
