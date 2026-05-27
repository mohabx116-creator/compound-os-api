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

const providerStatusSchema = z.enum(['PENDING', 'ACTIVE', 'INACTIVE']);

export const serviceProviderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  categoryId: z.string().uuid('Invalid category id').optional(),
  status: providerStatusSchema.optional(),
  isFeatured: optionalBooleanFlag,
});

export const serviceProviderParamsSchema = z.object({
  id: z.string().uuid('Invalid service provider id'),
});
