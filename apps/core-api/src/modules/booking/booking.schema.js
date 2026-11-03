import { z } from 'zod';
import { applyVoucherSchema, lockSeatsSchema, updateConcessionsSchema } from '@cinehub/contracts';

export const holdSeatsRequestSchema = {
  body: lockSeatsSchema,
};

export const updateBookingConcessionsRequestSchema = {
  body: updateConcessionsSchema,
};

export const applyBookingVoucherRequestSchema = {
  body: applyVoucherSchema,
};

export const checkoutBookingRequestSchema = {
  body: z.object({
    showtimeId: z.string().min(1),
    seatIds: z.array(z.string().min(1)).min(1),
    paymentProvider: z.enum(['VNPAY', 'ZALOPAY', 'MOMO']),
    voucherCode: z.string().optional(),
  }),
};
