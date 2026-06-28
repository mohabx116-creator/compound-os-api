import { z } from 'zod';
import {
  revenueCategoryValues,
  revenueRangeValues,
  revenueSourceTypeValues,
} from './platform-revenue.types.js';

const revenueRangeSchema = z.enum(revenueRangeValues);
const revenueCategorySchema = z.enum(revenueCategoryValues);
const revenueSourceTypeSchema = z.enum(revenueSourceTypeValues);

export const revenueSummaryQuerySchema = z.object({
  range: revenueRangeSchema.default('ALL'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  revenueCategory: revenueCategorySchema.optional(),
  sourceType: revenueSourceTypeSchema.optional(),
});

export const revenueEntriesQuerySchema = revenueSummaryQuerySchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
