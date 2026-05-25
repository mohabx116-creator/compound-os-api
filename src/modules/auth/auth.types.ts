import { z } from 'zod';
import type { authStatusResponseSchema } from './auth.schema.js';

export type AuthStatus = z.infer<typeof authStatusResponseSchema>;
