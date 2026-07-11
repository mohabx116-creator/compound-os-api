import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { successResponse } from '../../common/utils/api-response.js';
import { PublicStatsService } from './public-stats.service.js';

export class PublicStatsController {
  static getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await PublicStatsService.getPlatformStats();

    successResponse({
      res,
      message: 'Platform stats retrieved successfully',
      data: stats,
    });
  });
}
