import { z } from 'zod';

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(maxLength).optional(),
  );

const optionalCompoundCode = z.preprocess(
  (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === '' ? undefined : normalized;
  },
  z
    .string()
    .min(3, 'Compound code must be at least 3 characters')
    .max(50, 'Compound code must be at most 50 characters')
    .regex(
      /^[a-z0-9-]+$/,
      'Compound code may only contain lowercase letters, numbers, and hyphens',
    )
    .optional(),
);

const compoundPayloadFields = {
  name: z.string().trim().min(1, 'Compound name is required').max(120),
  code: optionalCompoundCode,
  adminEmail: z.string().trim().email('Invalid admin email').max(255),
  address: optionalText(500),
  logoUrl: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().url('Invalid logo URL').max(1000).optional(),
  ),
  phone: optionalText(30),
  isActive: z.boolean().optional(),
};

export const createCompoundSchema = z.object(compoundPayloadFields).strict();

export const updateCompoundSchema = z
  .object({
    name: compoundPayloadFields.name.optional(),
    code: compoundPayloadFields.code,
    adminEmail: compoundPayloadFields.adminEmail.optional(),
    address: compoundPayloadFields.address,
    logoUrl: compoundPayloadFields.logoUrl,
    phone: compoundPayloadFields.phone,
    isActive: compoundPayloadFields.isActive,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const compoundQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalText(100),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const compoundParamsSchema = z.object({
  id: z.string().uuid('Invalid compound id'),
});
