import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes, ErrorCode } from '../errors/error-codes.js';
import { errorResponse } from '../utils/api-response.js';
import { env } from '../../config/env.js';

export const errorMiddleware: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let code: ErrorCode = ErrorCodes.INTERNAL_SERVER_ERROR;
  let message = 'Internal Server Error';
  let errors: any[] | null = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation Error';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  } else if (err instanceof Error) {
    if (env.NODE_ENV === 'development') {
      message = err.message;
    }
  }

  const stack = env.NODE_ENV === 'development' && err instanceof Error ? err.stack : undefined;

  errorResponse({
    res,
    statusCode,
    message,
    code,
    errors,
    stack,
  });
};
