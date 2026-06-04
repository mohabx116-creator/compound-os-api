import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env if present
dotenv.config();

const optionalEnvString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const optionalEnvUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().url().optional(),
);

const commaSeparatedOrigins = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}, z.array(z.string().url()));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGINS: commaSeparatedOrigins.default([]),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL must not be empty'),
  PASSWORD_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  JWT_SECRET: z.preprocess(
    (value) =>
      value === '' ||
      value === 'CHANGE_ME_IN_PHASE_A2' ||
      value === 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET'
        ? undefined
        : value,
    z.string().min(32).optional(),
  ),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PAYMOB_API_KEY: optionalEnvString,
  PAYMOB_INTEGRATION_ID_CARD: optionalEnvString,
  PAYMOB_IFRAME_ID: optionalEnvString,
  PAYMOB_HMAC_SECRET: optionalEnvString,
  PAYMOB_CALLBACK_URL: optionalEnvUrl,
  PAYMOB_WEBHOOK_SECRET: optionalEnvString,
  PUBLIC_RENTAL_BASE_URL: optionalEnvUrl,
  CLOUDINARY_CLOUD_NAME: optionalEnvString,
  CLOUDINARY_API_KEY: optionalEnvString,
  CLOUDINARY_API_SECRET: optionalEnvString,
  CLOUDINARY_UPLOAD_FOLDER: optionalEnvString,
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration validation failed:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
