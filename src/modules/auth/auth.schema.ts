import { z } from 'zod';

const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export const residentLoginSchema = z
  .object({
    compoundCode: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
      z
        .string()
        .min(3, 'Compound code is required')
        .max(50, 'Compound code must be at most 50 characters')
        .regex(
          /^[a-z0-9-]+$/,
          'Compound code may only contain lowercase letters, numbers, and hyphens',
        ),
    ),
    phone: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() : value),
      z.string().min(1, 'Phone is required').max(30, 'Phone is too long'),
    ),
    password: passwordSchema,
  })
  .strict();

export const adminLoginSchema = z
  .object({
    email: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
      z.string().email('Invalid admin email').max(255),
    ),
    password: passwordSchema,
  })
  .strict();

export const authStatusResponseSchema = z.object({
  authEnabled: z.literal(true),
  phase: z.literal('login-jwt'),
  residentLogin: z.literal(true),
  adminLogin: z.literal(true),
});
