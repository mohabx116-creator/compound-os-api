import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { AdminRevenueController } from './admin-revenue.controller.js';
import { revenueEntriesQuerySchema, revenueSummaryQuerySchema } from '../platform-revenue/platform-revenue.schema.js';

const router = Router();

router.get(
  '/summary',
  validate({ query: revenueSummaryQuerySchema }),
  AdminRevenueController.getRevenueSummary,
);

router.get(
  '/entries',
  validate({ query: revenueEntriesQuerySchema }),
  AdminRevenueController.listRevenueEntries,
);

export const adminRevenueRoutes = router;
