import { z } from 'zod';

const optionalSearch = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().max(100).optional(),
);

const optionalBooleanFlag = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}, z.boolean().optional());

export const serviceCategoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  isActive: optionalBooleanFlag,
});

export const serviceCategoryParamsSchema = z.object({
  id: z.string().uuid('Invalid service category id'),
});
