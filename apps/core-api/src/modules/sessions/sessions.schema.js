import { z } from 'zod';

export const listSessionsSchema = z.object({
  query: z.object({
    movieId: z.string().optional(),
    cinemaId: z.string().optional(),
    movie: z.string().optional(),
    cinema: z.string().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
});
