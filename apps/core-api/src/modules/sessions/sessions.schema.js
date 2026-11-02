import { z } from 'zod';

export const listSessionsSchema = {
  query: z.object({
    movieId: z.string().optional(),
    cinemaId: z.string().optional(),
    date: z.string().optional(),
  }),
};
