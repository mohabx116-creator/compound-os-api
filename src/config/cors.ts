import type { CorsOptions } from 'cors';
import { AppError } from '../common/errors/AppError.js';
import { ErrorCodes } from '../common/errors/error-codes.js';
import { env } from './env.js';

const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:4175',
  'http://localhost:4176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://127.0.0.1:4175',
  'http://127.0.0.1:4176',
];

function getAllowedOrigins() {
  const origins = new Set(env.CORS_ORIGINS);

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

    callback(new AppError('Origin is not allowed by CORS policy', 403, ErrorCodes.FORBIDDEN));
  },
  allowedHeaders: ['Authorization', 'Content-Type'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
};
