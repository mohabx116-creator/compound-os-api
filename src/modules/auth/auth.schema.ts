import { z } from 'zod';

export const authStatusResponseSchema = z.object({
  authEnabled: z.literal(false),
  phase: z.literal('foundation'),
});
