import { PlatformRevenueCategory, PlatformRevenueSourceType } from '@prisma/client';
import { z } from 'zod';
import { revenueRangeValues } from './platform-revenue.types.js';

const revenueRangeSchema = z.enum(revenueRangeValues);
const revenueCategorySchema = z.nativeEnum(PlatformRevenueCategory);
const revenueSourceTypeSchema = z.nativeEnum(PlatformRevenueSourceType);

export const revenueSummaryQuerySchema = z.object({
  range: revenueRangeSchema.default('MONTH'),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  revenueCategory: revenueCategorySchema.optional(),
  sourceType: revenueSourceTypeSchema.optional(),
});

export const revenueEntriesQuerySchema = revenueSummaryQuerySchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
