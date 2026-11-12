import { z } from 'zod';
import {
  lockSeatsSchema,
  applyVoucherSchema,
  updateConcessionsSchema,
  checkoutBookingSchema,
} from '@cinehub/contracts';

export const holdSeatsRequestSchema = z.object({
  body: lockSeatsSchema,
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const validateVoucherRequestSchema = z.object({
  body: applyVoucherSchema,
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});

export const updateConcessionsRequestSchema = z.object({
  body: updateConcessionsSchema,
  query: z.object({}).passthrough(),
  params: z.object({ bookingId: z.string().min(1) }),
});

export const checkoutRequestSchema = z.object({
  body: checkoutBookingSchema,
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough(),
});
