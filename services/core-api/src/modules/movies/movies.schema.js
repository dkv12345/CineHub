import { z } from 'zod';

export const getMovieSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});
