import { Request, Response } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

export class AdminDashboardController {
  private static getCompoundId(req: Request): string {
    const compoundId = req.auth?.compoundId;

    if (!compoundId) {
      throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
    }

    return compoundId;
  }

  static getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
    const compoundId = this.getCompoundId(req);

    const summary = await AdminDashboardService.getSummary(compoundId);

    successResponse({
      res,
      message: 'Dashboard summary retrieved successfully',
      data: summary,
    });
  });
}
