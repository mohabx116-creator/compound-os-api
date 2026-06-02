import { z } from 'zod';

const optionalSearch = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().max(100).optional(),
);

const optionalBooleanFlag = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === true || value === false) return value;
  return undefined;
}, z.boolean().optional());

const optionalEmail = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().email('Invalid email').optional(),
);

const optionalText = (max = 500) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const tenantPhoneSchema = z
  .string()
  .trim()
  .min(5, 'Tenant phone is required')
  .max(30, 'Tenant phone is too long');

const listingTypeSchema = z.enum(['APARTMENT', 'VILLA', 'STUDIO', 'DUPLEX', 'OFFICE', 'SHOP']);
const furnishingStatusSchema = z.enum(['UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED']);
const listingStatusSchema = z.enum([
  'DRAFT',
  'PENDING_PAYMENT',
  'PENDING_REVIEW',
  'ACTIVE',
  'PAYMENT_LOCKED',
  'RESERVED',
  'RENTED',
  'EXPIRED',
  'SUSPENDED',
  'REJECTED',
  'REMOVED',
]);

const rentalListQueryBaseSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  listingType: listingTypeSchema.optional(),
  minRent: z.coerce.number().positive().optional(),
  maxRent: z.coerce.number().positive().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  furnishingStatus: furnishingStatusSchema.optional(),
  featured: optionalBooleanFlag,
});

const rentRangeSchema = (value: { minRent?: number; maxRent?: number }) =>
  value.minRent === undefined ||
  value.maxRent === undefined ||
  value.minRent <= value.maxRent;

export const rentalListQuerySchema = rentalListQueryBaseSchema.refine(
  rentRangeSchema,
  'minRent must be less than or equal to maxRent',
);

export const adminRentalListQuerySchema = rentalListQueryBaseSchema
  .extend({
    status: listingStatusSchema.optional(),
    ownerId: z.string().uuid('Invalid owner id').optional(),
  })
  .refine(rentRangeSchema, 'minRent must be less than or equal to maxRent');

export const rentalIdParamsSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export const rentalSlugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(160),
});

export const tenantPaymentRequestSchema = z
  .object({
    tenantName: z.string().trim().min(1, 'Tenant name is required').max(150),
    tenantPhone: tenantPhoneSchema,
    tenantEmail: optionalEmail,
  })
  .strict();

export const contactAccessQuerySchema = z.object({
  tenantPhone: tenantPhoneSchema,
});

const listingImageSchema = z
  .object({
    url: z.string().trim().url('Invalid image URL'),
    altText: optionalText(200),
    sortOrder: z.number().int().min(0).optional(),
    isCover: z.boolean().optional(),
  })
  .strict();

export const adminCreateListingSchema = z
  .object({
    compoundId: z.string().uuid('Invalid compound id'),
    ownerId: z.string().uuid('Invalid owner id'),
    unitId: z.string().uuid('Invalid unit id').optional(),
    title: z.string().trim().min(3).max(180),
    description: z.string().trim().min(10).max(5000),
    listingType: listingTypeSchema,
    furnishingStatus: furnishingStatusSchema,
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().int().min(0).max(20),
    areaSqm: z.number().positive().max(100000),
    floor: z.number().int().nullable().optional(),
    monthlyRent: z.number().positive().max(100000000),
    depositAmount: z.number().nonnegative().max(100000000).optional(),
    contactUnlockFee: z.number().positive().max(1000000).optional(),
    reservationFee: z.number().positive().max(10000000).optional(),
    platformCommissionRate: z.number().nonnegative().max(100).optional(),
    addressText: optionalText(500),
    locationText: optionalText(500),
    images: z.array(listingImageSchema).max(20).optional(),
  })
  .strict();

export const adminUpdateListingSchema = adminCreateListingSchema
  .omit({ compoundId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
