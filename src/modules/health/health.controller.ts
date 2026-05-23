import { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { successResponse } from '../../common/utils/api-response.js';

export const getHealth = (req: Request, res: Response): void => {
  successResponse({
    res,
    statusCode: 200,
    message: 'API is healthy',
    data: {
      service: 'compound-os-api',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
};
