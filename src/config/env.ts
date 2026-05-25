import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL must not be empty'),
  PASSWORD_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  JWT_SECRET: z.preprocess(
    (value) =>
      value === '' || value === 'CHANGE_ME_IN_PHASE_A2' ? undefined : value,
    z.string().min(32).optional(),
  ),
  JWT_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
