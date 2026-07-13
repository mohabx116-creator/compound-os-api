import { Router } from 'express';
import { rateLimit } from '../../common/middlewares/rate-limit.middleware.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { RatingsController } from './ratings.controller.js';
import { ratingSummaryQuerySchema, submitRatingSchema } from './ratings.schema.js';

const router = Router();

const publicRatingSubmitLimiter = rateLimit({
  keyPrefix: 'ratings:public-submit',
  max: 12,
  windowMs: 60 * 60 * 1000,
});

router.post(
  '/',
  publicRatingSubmitLimiter,
  validate({ body: submitRatingSchema }),
  RatingsController.submitSiteRating,
);

router.get(
  '/summary',
  validate({ query: ratingSummaryQuerySchema }),
  RatingsController.getSummary,
);

export const ratingsRoutes = router;
