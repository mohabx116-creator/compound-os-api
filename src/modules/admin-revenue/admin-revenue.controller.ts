import { Request, Response } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { revenueEntriesQuerySchema, revenueSummaryQuerySchema } from '../platform-revenue/platform-revenue.schema.js';
import { PlatformRevenueService } from '../platform-revenue/platform-revenue.service.js';
import type { RevenueDateRange } from '../platform-revenue/platform-revenue.types.js';

export class AdminRevenueController {
  private static getCompoundId(req: Request): string {
    const compoundId = req.auth?.compoundId;

    if (!compoundId) {
      throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
    }

    return compoundId;
  }

  static getRevenueSummary = asyncHandler(async (req: Request, res: Response) => {
    const compoundId = this.getCompoundId(req);
    const query: RevenueDateRange = revenueSummaryQuerySchema.parse(req.query);

    const summary = await PlatformRevenueService.getRevenueSummary(compoundId, query);

    successResponse({
      res,
      message: 'Revenue summary retrieved successfully',
      data: summary,
    });
  });

  static listRevenueEntries = asyncHandler(async (req: Request, res: Response) => {
    const compoundId = this.getCompoundId(req);
    const query = revenueEntriesQuerySchema.parse(req.query) as RevenueDateRange & {
      page: number;
      limit: number;
    };

    const entries = await PlatformRevenueService.listRevenueEntries(compoundId, query);

    successResponse({
      res,
      message: 'Revenue entries retrieved successfully',
      data: entries.entries,
      meta: entries.meta,
    });
  });
}
