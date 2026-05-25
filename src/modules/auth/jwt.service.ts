import jwt, { type SignOptions } from 'jsonwebtoken';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { env } from '../../config/env.js';
import type { AuthTokenPayload } from './auth.types.js';

function getJwtSecret(): string {
  if (!env.JWT_SECRET) {
    throw new AppError(
      'Authentication is not configured',
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
    );
  }

  return env.JWT_SECRET;
}

export function signAccessToken(payload: AuthTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, getJwtSecret(), options);
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret());

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      decoded.type !== 'access' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.role !== 'string' ||
      typeof decoded.compoundId !== 'string'
    ) {
      throw new Error('Invalid token payload');
    }

    return {
      sub: decoded.sub,
      role: decoded.role,
      compoundId: decoded.compoundId,
      unitId: typeof decoded.unitId === 'string' ? decoded.unitId : null,
      type: 'access',
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or expired token', 401, ErrorCodes.UNAUTHORIZED);
  }
}
