import { z } from 'zod';

export const listConcessionsSchema = z.object({
  query: z.object({
    chain: z.string().min(1).default('GALAXY'),
    cinemaCode: z.string().min(1).optional(),
  }),
});
