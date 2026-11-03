import { z } from 'zod';

export const recommendationsSchema = z.object({
  body: z.object({
    recentMovieIds: z.array(z.string().min(1).max(36)).max(20).default([]),
    favoriteMovieIds: z.array(z.string().min(1).max(36)).max(20).default([]),
  }),
});
