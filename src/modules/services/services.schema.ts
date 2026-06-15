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
const serviceRequestPrioritySchema = z.enum(['NORMAL', 'URGENT']);
const serviceRequestStatusSchema = z.enum(['NEW', 'IN_REVIEW', 'CONTACTED', 'DONE', 'CANCELLED']);

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(120, 'Slug must be at most 120 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may only contain lowercase letters, numbers, and hyphens');

export const servicePublicQuerySchema = z.object({
  compoundId: z.string().uuid('Invalid compound id').optional(),
});

export const serviceCategoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalSearch(),
  compoundId: z.string().uuid('Invalid compound id').optional(),
  isActive: optionalBooleanFlag,
});

export const serviceCategoryParamsSchema = z.object({
  id: z.string().uuid('Invalid category id'),
});

export const serviceCategorySlugParamsSchema = z.object({
  slug: z.string().trim().min(1, 'Invalid category slug').max(120),
});

export const createServiceCategorySchema = z
  .object({
    compoundId: z.string().uuid('Invalid compound id').optional(),
    name: z.string().trim().min(2, 'Category name is required').max(150),
    slug: slugSchema.optional(),
    description: optionalText(1000),
    icon: optionalText(120),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateServiceCategorySchema = z
  .object({
    name: z.string().trim().min(2, 'Category name is required').max(150).optional(),
    slug: slugSchema.optional(),
    description: optionalText(1000),
    icon: optionalText(120),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const publicServiceItemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: optionalSearch(),
  compoundId: z.string().uuid('Invalid compound id').optional(),
  categorySlug: z.string().trim().min(1, 'Invalid category slug').max(120).optional(),
  featured: optionalBooleanFlag,
});

export const adminServiceItemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalSearch(),
  compoundId: z.string().uuid('Invalid compound id').optional(),
  categoryId: z.string().uuid('Invalid category id').optional(),
  status: serviceItemStatusSchema.optional(),
  isPublic: optionalBooleanFlag,
  isFeatured: optionalBooleanFlag,
  acceptsRequests: optionalBooleanFlag,
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
    categoryId: z.string().uuid('Invalid category id'),
    title: z.string().trim().min(2, 'Service title is required').max(150),
    slug: slugSchema.optional(),
    description: optionalText(5000),
    imageUrl: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().url('Invalid image URL').optional(),
    ),
    locationText: optionalText(250),
    workingHours: optionalText(250),
    phone: optionalText(30),
    whatsapp: optionalText(30),
    isPublic: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    acceptsRequests: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
    status: serviceItemStatusSchema.optional(),
  })
  .strict();

export const updateServiceItemSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category id').optional(),
    title: z.string().trim().min(2, 'Service title is required').max(150).optional(),
    slug: slugSchema.optional(),
    description: optionalText(5000),
    imageUrl: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().url('Invalid image URL').optional(),
    ),
    locationText: optionalText(250),
    workingHours: optionalText(250),
    phone: optionalText(30),
    whatsapp: optionalText(30),
    isPublic: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    acceptsRequests: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(1000).optional(),
    status: serviceItemStatusSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const serviceRequestCreateSchema = z
  .object({
    requesterName: z.string().trim().min(2, 'Requester name is required').max(150),
    requesterPhone: z.string().trim().min(5, 'Requester phone is required').max(30),
    unitText: optionalText(120),
    problemDescription: z.string().trim().min(5, 'Problem description is required').max(5000),
    priority: serviceRequestPrioritySchema.optional(),
    preferredTime: optionalText(250),
    imageUrl: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().trim().url('Invalid image URL').optional(),
    ),
  })
  .strict();

export const serviceRequestQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalSearch(),
  compoundId: z.string().uuid('Invalid compound id').optional(),
  serviceItemId: z.string().trim().min(1, 'Invalid service item id').max(100).optional(),
  status: serviceRequestStatusSchema.optional(),
  priority: serviceRequestPrioritySchema.optional(),
});

export const serviceRequestParamsSchema = z.object({
  id: z.string().trim().min(1, 'Invalid service request id').max(100),
});

export const updateServiceRequestStatusSchema = z
  .object({
    status: serviceRequestStatusSchema,
    adminNotes: optionalText(5000),
  })
  .strict();
