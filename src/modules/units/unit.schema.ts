import { z } from 'zod';

const unitTypeSchema = z.enum(['APARTMENT', 'VILLA', 'SHOP', 'OFFICE']);
const unitStatusSchema = z.enum(['OCCUPIED', 'VACANT', 'MAINTENANCE']);

const unitNumberSchema = z
  .string()
  .trim()
  .min(1, 'Unit number is required')
  .max(50, 'Unit number must be at most 50 characters');

const optionalSearch = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().max(100).optional(),
);

export const createUnitSchema = z
  .object({
    compoundId: z.string().uuid('Invalid compound id'),
    unitNumber: unitNumberSchema,
    unitType: unitTypeSchema.optional(),
    floor: z.number().int().optional(),
    areaSqm: z.number().positive('Area must be greater than zero').optional(),
    status: unitStatusSchema.optional(),
  })
  .strict();

export const updateUnitSchema = z
  .object({
    unitNumber: unitNumberSchema.optional(),
    unitType: unitTypeSchema.optional(),
    floor: z.number().int().nullable().optional(),
    areaSqm: z.number().positive('Area must be greater than zero').nullable().optional(),
    status: unitStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const unitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  status: unitStatusSchema.optional(),
  unitType: unitTypeSchema.optional(),
});

export const unitParamsSchema = z.object({
  id: z.string().uuid('Invalid unit id'),
});
