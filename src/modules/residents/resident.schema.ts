import { z } from 'zod';

const residentRoleSchema = z.enum([
  'ADMIN',
  'MANAGER',
  'ACCOUNTANT',
  'SECURITY',
  'MAINTENANCE',
  'RESIDENT',
]);

const residentStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'PENDING']);

const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Full name is required')
  .max(120, 'Full name must be at most 120 characters');

const phoneSchema = z
  .string()
  .trim()
  .min(3, 'Phone is required')
  .max(30, 'Phone must be at most 30 characters');

const optionalEmailSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().email('Invalid email').max(255).optional(),
);

const nullableEmailSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().trim().email('Invalid email').max(255).nullable().optional(),
);

const optionalSearch = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().max(100).optional(),
);

export const createResidentSchema = z
  .object({
    compoundId: z.string().uuid('Invalid compound id'),
    unitId: z.string().uuid('Invalid unit id').optional(),
    fullName: fullNameSchema,
    phone: phoneSchema,
    email: optionalEmailSchema,
    role: residentRoleSchema.optional(),
    status: residentStatusSchema.optional(),
  })
  .strict();

export const updateResidentSchema = z
  .object({
    unitId: z.string().uuid('Invalid unit id').nullable().optional(),
    fullName: fullNameSchema.optional(),
    phone: phoneSchema.optional(),
    email: nullableEmailSchema,
    role: residentRoleSchema.optional(),
    status: residentStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const residentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  unitId: z.string().uuid('Invalid unit id').optional(),
  role: residentRoleSchema.optional(),
  status: residentStatusSchema.optional(),
});

export const residentParamsSchema = z.object({
  id: z.string().uuid('Invalid resident id'),
});
