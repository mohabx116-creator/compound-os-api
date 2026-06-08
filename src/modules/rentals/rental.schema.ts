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
const unitConditionSchema = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.enum(['سوبر لوكس', 'مفروشة', 'فاضية']).optional(),
);
const rentalOwnerStatusSchema = z.enum(['PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED']);
const ownerSubmissionStatusSchema = z.enum([
  'NEW',
  'UNDER_REVIEW',
  'NEEDS_CHANGES',
  'APPROVED',
  'REJECTED',
  'CONVERTED_TO_LISTING',
  'CANCELLED',
]);
const rentalInquiryStatusSchema = z.enum([
  'NEW',
  'CONTACT_UNLOCKED',
  'VIEWING_REQUESTED',
  'CLOSED',
  'CANCELLED',
]);
const rentalInquiryTypeSchema = z.enum(['VIEWING_REQUEST', 'GENERAL']);
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
  limit: z.coerce.number().int().min(1).max(100).default(12),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  listingType: listingTypeSchema.optional(),
  minRent: z.coerce.number().positive().optional(),
  maxRent: z.coerce.number().positive().optional(),
  bedrooms: z.coerce.number().int().min(0).optional(),
  furnishingStatus: furnishingStatusSchema.optional(),
  featured: optionalBooleanFlag,
});

const publicRentalListQuerySchema = rentalListQueryBaseSchema.extend({
  limit: z.coerce.number().int().min(1).default(12),
});

const rentRangeSchema = (value: { minRent?: number; maxRent?: number }) =>
  value.minRent === undefined ||
  value.maxRent === undefined ||
  value.minRent <= value.maxRent;

export const rentalListQuerySchema = publicRentalListQuerySchema.refine(
  rentRangeSchema,
  'minRent must be less than or equal to maxRent',
).transform((value) => ({
  ...value,
  limit: Math.min(value.limit, 24),
}));

export const adminRentalListQuerySchema = rentalListQueryBaseSchema
  .extend({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: listingStatusSchema.optional(),
    ownerId: z.string().uuid('Invalid owner id').optional(),
  })
  .refine(rentRangeSchema, 'minRent must be less than or equal to maxRent');

export const rentalOwnerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  status: rentalOwnerStatusSchema.optional(),
});

export const rentalIdParamsSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

export const rentalOwnerParamsSchema = z.object({
  id: z.string().uuid('Invalid owner id'),
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

export const createRentalInquirySchema = z
  .object({
    tenantName: z.string().trim().min(1, 'Tenant name is required').max(150),
    tenantPhone: tenantPhoneSchema,
    tenantEmail: optionalEmail,
    tenantNationalId: z.string().trim().regex(/^[0-9]{14}$/, 'Tenant national id must be exactly 14 English digits').optional(),
    message: optionalText(2000),
    inquiryType: rentalInquiryTypeSchema.optional(),
  })
  .strict();

export const rentalInquiryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  listingId: z.string().uuid('Invalid listing id').optional(),
  compoundId: z.string().uuid('Invalid compound id').optional(),
  status: rentalInquiryStatusSchema.optional(),
});

export const rentalInquiryParamsSchema = z.object({
  id: z.string().uuid('Invalid inquiry id'),
});

export const updateRentalInquiryStatusSchema = z
  .object({
    status: rentalInquiryStatusSchema,
  })
  .strict();

const listingImageSchema = z
  .object({
    url: z.string().trim().url('Invalid image URL'),
    publicId: optionalText(300),
    storagePath: optionalText(500),
    altText: optionalText(200),
    sortOrder: z.number().int().min(0).optional(),
    isCover: z.boolean().optional(),
  })
  .strict();

const publicOwnerSubmissionImageSchema = listingImageSchema
  .extend({
    publicId: optionalText(300),
    storagePath: optionalText(500),
  })
  .strict();

const policyAcceptedSchema = z.preprocess((value) => {
  if (value === 'true' || value === true) return true;
  return value;
}, z.literal(true, {
  errorMap: () => ({ message: 'Refund policy and publishing terms must be accepted' }),
}));

export const cloudinaryUploadSignatureSchema = z
  .object({
    folder: optionalText(200),
  })
  .strict();

export const createOwnerSubmissionSchema = z
  .object({
    ownerName: z.string().trim().min(2, 'Owner name is required').max(150).refine(
      (value) => value.split(/\s+/).filter(Boolean).length >= 2,
      'Owner full name must include at least two words',
    ),
    ownerPhone: z.string().trim().min(5, 'Owner phone is required').max(30),
    ownerWhatsapp: z.string().trim().min(5, 'Owner WhatsApp is required').max(30),
    ownerEmail: optionalEmail,
    ownerNationalId: optionalText(50),
    preferredContactMethod: optionalText(40),
    listingType: listingTypeSchema.default('APARTMENT'),
    title: optionalText(180),
    description: optionalText(5000),
    addressText: optionalText(500),
    locationText: optionalText(500),
    floor: z.number().int().nullable().optional(),
    areaSqm: z.number().positive().max(100000).optional(),
    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().int().min(0).max(20).default(1),
    furnishingStatus: furnishingStatusSchema.default('UNFURNISHED'),
    unitCondition: unitConditionSchema,
    basics: optionalText(2000),
    amenities: optionalText(2000),
    monthlyRent: z.number().positive().max(100000000),
    depositAmount: z.number().nonnegative().max(100000000),
    images: z.array(publicOwnerSubmissionImageSchema).min(1, 'At least one image is required').max(12),
    policyAccepted: policyAcceptedSchema,
  })
  .strict();

export const ownerSubmissionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  compoundId: z.string().uuid('Invalid compound id').optional(),
  status: ownerSubmissionStatusSchema.optional(),
});

export const ownerSubmissionParamsSchema = z.object({
  id: z.string().uuid('Invalid owner submission id'),
});

export const updateOwnerSubmissionStatusSchema = z
  .object({
    status: ownerSubmissionStatusSchema,
    adminNotes: optionalText(2000),
    rejectionReason: optionalText(1000),
  })
  .strict();

export const adminCreateListingSchema = z
  .object({
    compoundId: z.string().uuid('Invalid compound id').optional(),
    ownerId: z.string().uuid('Invalid owner id').optional(),
    ownerName: z.string().trim().min(2, 'Owner name is required').max(150),
    ownerPhone: z.string().trim().min(5, 'Owner phone is required').max(30),
    ownerWhatsapp: z.string().trim().min(5, 'Owner WhatsApp is required').max(30),
    unitId: z.string().uuid('Invalid unit id').optional(),
    title: optionalText(180),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format. Slug must contain only lowercase alphanumeric characters and single hyphens, starting and ending with alphanumeric characters.')
      .max(160)
      .optional(),
    isFeatured: z.boolean().optional(),
    description: optionalText(5000),
    listingType: listingTypeSchema.default('APARTMENT'),
    furnishingStatus: furnishingStatusSchema,
    unitCondition: unitConditionSchema,
    basics: optionalText(2000),
    amenities: optionalText(2000),
    bedrooms: z.number().int().min(0).max(20).default(2),
    bathrooms: z.number().int().min(0).max(20).default(1),
    areaSqm: z.number().positive().max(100000),
    floor: z.number().int(),
    monthlyRent: z.number().positive().max(100000000),
    depositAmount: z.number().nonnegative().max(100000000),
    contactUnlockFee: z.number().positive().max(1000000).optional(),
    reservationFee: z.number().positive().max(10000000).optional(),
    platformCommissionRate: z.number().nonnegative().max(100).optional(),
    addressText: optionalText(500),
    locationText: optionalText(500),
    images: z.array(listingImageSchema).max(20).optional(),
    totalBeds: z.number().int().min(1).max(20).optional(),
  })
  .strict();

export const adminUpdateListingSchema = adminCreateListingSchema
  .omit({ compoundId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createRentalOwnerSchema = z
  .object({
    compoundId: z.string().uuid('Invalid compound id'),
    residentId: z.string().uuid('Invalid resident id').optional(),
    fullName: z.string().trim().min(2, 'Owner name is required').max(150),
    phone: z.string().trim().min(5, 'Owner phone is required').max(30),
    whatsappPhone: optionalText(30),
    email: optionalEmail,
    nationalId: optionalText(50),
    status: rentalOwnerStatusSchema.default('ACTIVE'),
  })
  .strict();

export const updateRentalOwnerSchema = createRentalOwnerSchema
  .omit({ compoundId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
