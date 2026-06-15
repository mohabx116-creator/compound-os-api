import type { CorsOptions } from 'cors';
import { AppError } from '../common/errors/AppError.js';
import { ErrorCodes } from '../common/errors/error-codes.js';
import { env } from './env.js';

const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

function getAllowedOrigins() {
  const origins = new Set(env.CORS_ORIGINS);

  // Always allow the public services web origin
  origins.add('https://compound-os-services-web.vercel.app');

  if (env.NODE_ENV !== 'production') {
    for (const origin of LOCAL_DEVELOPMENT_ORIGINS) {
      origins.add(origin);
    }
  }

  return origins;
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (getAllowedOrigins().has(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError('CORS origin is not allowed', 403, ErrorCodes.CORS_ORIGIN_NOT_ALLOWED));
  },
  allowedHeaders: ['Authorization', 'Content-Type'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
};
