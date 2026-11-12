import { z } from 'zod';
import { MAX_SEATS_PER_BOOKING } from '@cinehub/contracts';

export const listConcessionsSchema = z.object({
  query: z.object({
    chain: z.string().min(1).default('GALAXY'),
    cinemaCode: z.string().min(1).optional(),
    cinemaId: z.string().uuid().optional(),
    seats: z.coerce.number().int().min(1).max(MAX_SEATS_PER_BOOKING).optional(),
  }),
});
