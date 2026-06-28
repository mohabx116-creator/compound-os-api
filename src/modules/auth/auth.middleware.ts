import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { ADMIN_ROLES, OWNER_ROLES } from './auth.constants.js';
import { verifyAccessToken } from './jwt.service.js';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED));
    return;
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    next(new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED));
    return;
  }

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(allowedRoles: readonly string[]) {
  const allowedRoleSet = new Set(allowedRoles);

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED));
      return;
    }

    if (!allowedRoleSet.has(req.auth.role)) {
      next(new AppError('Forbidden', 403, ErrorCodes.FORBIDDEN));
      return;
    }

    next();
  };
}

export const requireAdminRole = requireRoles(ADMIN_ROLES);
export const requireOwnerRole = requireRoles(OWNER_ROLES);
