import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { successResponse } from '../../common/utils/api-response.js';
import { RatingsService } from './ratings.service.js';
import type { RatingSummaryQuery, SubmitRatingInput } from './ratings.types.js';

export class RatingsController {
  static submitSiteRating = asyncHandler(async (req: Request, res: Response) => {
    await RatingsService.submitSiteRating(req, req.body as SubmitRatingInput);

    successResponse({
      res,
      message: 'Thank you for your feedback',
    });
  });

  static getSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await RatingsService.getPublicSummary(req.query as unknown as RatingSummaryQuery);

    successResponse({
      res,
      message: 'Ratings summary retrieved successfully',
      data: summary,
    });
  });
}
