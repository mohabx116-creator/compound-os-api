import { Response } from 'express';

export interface SuccessResponseInput<T = any> {
  res: Response;
  statusCode?: number;
  message: string;
  data?: T | null;
  meta?: Record<string, any>;
}

export interface ErrorResponseInput {
  res: Response;
  statusCode: number;
  message: string;
  code: string;
  errors?: any[] | null;
  stack?: string;
}

export function successResponse<T>({
  res,
  statusCode = 200,
  message,
  data = null,
  meta,
}: SuccessResponseInput<T>): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function errorResponse({
  res,
  statusCode,
  message,
  code,
  errors = null,
  stack,
}: ErrorResponseInput): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(errors ? { errors } : {}),
    ...(stack ? { stack } : {}),
  });
}
