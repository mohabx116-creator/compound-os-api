import { Request, Response } from 'express';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { AuthService } from './auth.service.js';

export class AuthController {
  static getStatus = asyncHandler(async (_req: Request, res: Response) => {
    successResponse({
      res,
      message: 'Auth module is ready',
      data: AuthService.getStatus(),
    });
  });
}
