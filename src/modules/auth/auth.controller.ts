import { Request, Response } from 'express';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { AuthService } from './auth.service.js';
import type { AdminLoginInput, ResidentLoginInput } from './auth.types.js';

export class AuthController {
  static getStatus = asyncHandler(async (_req: Request, res: Response) => {
    successResponse({
      res,
      message: 'Auth module is ready',
      data: AuthService.getStatus(),
    });
  });

  static loginResident = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.loginResident(req.body as ResidentLoginInput);

    successResponse({
      res,
      message: 'Resident logged in successfully',
      data: result,
    });
  });

  static loginAdmin = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.loginAdmin(req.body as AdminLoginInput);

    successResponse({
      res,
      message: 'Admin logged in successfully',
      data: result,
    });
  });

  static getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await AuthService.getCurrentUser(req.auth!);

    successResponse({
      res,
      message: 'Authenticated user retrieved successfully',
      data: user,
    });
  });
}
