import { z } from 'zod';

export const chatMessageSchema = z.object({
  body: z.object({
    message: z.string().trim().min(1).max(500),
    sessionId: z.string().uuid().optional(),
  }),
});
