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
  ticketTypes: z.record(z.string(), z.string()).optional(),
  enforceOrphanRule: z.boolean().optional(),
  ttlSeconds: z.coerce.number().int().min(10).max(1800).optional(),
  metadata: z
    .object({
      movieId: z.string().optional(),
      movieTitle: z.string().optional(),
      cinemaId: z.string().optional(),
      cinemaCode: z.string().optional(),
      cinemaName: z.string().optional(),
      screenName: z.string().optional(),
      showDate: z.string().optional(),
      showTime: z.string().optional(),
      format: z.string().optional(),
      backdropUrl: z.string().optional(),
    })
    .optional(),
});

export const updateConcessionsSchema = z.object({
  items: z.array(
    z.object({
      concessionId: z.string().min(1),
      name: z.string().optional(),
      unitPrice: z.number().int().min(0).optional(),
      quantity: z.number().int().min(0).max(20),
    }),
  ),
});

export const applyVoucherSchema = z.object({
  code: z.string().trim().min(1, 'Vui lòng nhập mã giảm giá'),
  subtotalAmount: z.coerce.number().int().min(0).optional(),
  bookingId: z.string().optional(),
});

export const checkoutBookingSchema = z.object({
  showtimeId: z.string().min(1),
  bookingId: z.string().optional(),
  seatIds: z.array(z.string().min(1)).min(1).max(MAX_SEATS_PER_BOOKING).optional(),
  voucherCode: z.string().trim().nullable().optional(),
  concessions: z
    .array(
      z.object({
        concessionId: z.string().min(1),
        name: z.string().optional(),
        unitPrice: z.number().int().min(0).optional(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .default([]),
  paymentMethod: z.enum(['VNPAY', 'MOMO', 'ZALOPAY', 'VIETQR']).default('VNPAY'),
});

export const staffCheckinSchema = z.object({
  qrPayload: z.string().trim().optional(),
  bookingCode: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(2).max(1000),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(20).optional().nullable(),
  avatarUrl: z.string().trim().max(500).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export const chatMessageBody = z.object({
  message: z.string().trim().min(1).max(500),
  sessionId: z.string().uuid().optional(),
});

export const recommendationsBody = z.object({
  recentMovieIds: z.array(z.string().min(1).max(36)).max(20).default([]),
  favoriteMovieIds: z.array(z.string().min(1).max(36)).max(20).default([]),
});
