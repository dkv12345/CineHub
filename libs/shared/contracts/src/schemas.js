import { z } from 'zod';
import { MAX_SEATS_PER_BOOKING } from './constants.js';

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const registerBody = z.object({
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ và tên'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
  phone: z.string().optional(),
});

export const loginBody = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const verifyEmailBody = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Mã xác thực gồm 6 chữ số'),
});

export const resendVerificationBody = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
});

export const refreshTokenBody = z.object({
  refreshToken: z.string().optional(),
});

export const googleAuthBody = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const forgotPasswordBody = z.object({
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
});

export const resetPasswordBody = z.object({
  token: z.string().min(1, 'Token đặt lại mật khẩu không hợp lệ'),
  newPassword: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(100),
});

export const lockSeatsSchema = z.object({
  showtimeId: z.string().min(1, 'Vui lòng chọn suất chiếu'),
  seatIds: z
    .array(z.string().min(1))
    .min(1, 'Vui lòng chọn ít nhất 1 ghế')
    .max(MAX_SEATS_PER_BOOKING, `Chỉ được chọn tối đa ${MAX_SEATS_PER_BOOKING} ghế`),
});

export const updateConcessionsSchema = z.object({
  items: z.array(
    z.object({
      concessionId: z.string().min(1),
      quantity: z.number().int().min(0).max(20),
    }),
  ),
});

export const applyVoucherSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã giảm giá'),
});

export const chatMessageBody = z.object({
  message: z.string().trim().min(1).max(500),
  sessionId: z.string().uuid().optional(),
});

export const recommendationsBody = z.object({
  recentMovieIds: z.array(z.string().min(1).max(36)).max(20).default([]),
  favoriteMovieIds: z.array(z.string().min(1).max(36)).max(20).default([]),
});
