import { z } from 'zod';

const optionalText = (max = 500) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalSearch = (max = 100) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalBooleanFlag = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === true || value === false) return value;
  return undefined;
}, z.boolean().optional());

const serviceItemStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
const serviceItemKindSchema = z.enum(['FACILITY', 'TECHNICAL']);

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(120, 'Slug must be at most 120 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens');

export const servicePublicQuerySchema = z.object({
  compoundId: z.string().uuid('Invalid compound id').optional(),
});

export const publicServiceItemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: optionalSearch(),
  compoundId: z.string().uuid('Invalid compound id').optional(),
  kind: serviceItemKindSchema.optional(),
  featured: optionalBooleanFlag,
});

export const adminServiceItemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalSearch(),
  compoundId: z.string().uuid('Invalid compound id').optional(),
  categoryId: z.string().uuid('Invalid category id').optional(),
  kind: serviceItemKindSchema.optional(),
  status: serviceItemStatusSchema.optional(),
  isPublic: optionalBooleanFlag,
  isFeatured: optionalBooleanFlag,
});

export const serviceItemParamsSchema = z.object({
  id: z.string().trim().min(1, 'Invalid service item id').max(100),
});

export const serviceItemSlugParamsSchema = z.object({
  slug: z.string().trim().min(1, 'Invalid service item slug').max(120),
});

export const createServiceItemSchema = z
  .object({
    compoundId: z.string().uuid('Invalid compound id').optional(),
    categoryId: z.string().uuid('Invalid category id').optional(),
    kind: serviceItemKindSchema,
    title: z.string().trim().min(2, 'Service title is required').max(150),
    slug: slugSchema.optional(),
    shortDescription: optionalText(1000),
    description: optionalText(5000),
    imageUrl: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().url('Invalid image URL').optional(),
    ),
    images: z.array(z.string().trim().url('Invalid image URL')).optional(),
    address: optionalText(250),
    googleMapsUrl: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().url('Invalid Google Maps URL').optional(),
    ),
    workingHours: optionalText(250),
    phone: optionalText(30),
    whatsapp: optionalText(30),
    isPublic: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
    status: serviceItemStatusSchema.optional(),
  })
  .strict();

export const updateServiceItemSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category id').optional(),
    kind: serviceItemKindSchema.optional(),
    title: z.string().trim().min(2, 'Service title is required').max(150).optional(),
    slug: slugSchema.optional(),
    shortDescription: optionalText(1000),
    description: optionalText(5000),
    imageUrl: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().url('Invalid image URL').optional(),
    ),
    images: z.array(z.string().trim().url('Invalid image URL')).optional(),
    address: optionalText(250),
    googleMapsUrl: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().url('Invalid Google Maps URL').optional(),
    ),
    workingHours: optionalText(250),
    phone: optionalText(30),
    whatsapp: optionalText(30),
    isPublic: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
    status: serviceItemStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
