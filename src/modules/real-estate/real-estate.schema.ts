import { z } from 'zod';
import {
  RealEstateType,
  RealEstateStatus,
  RealEstateFinishing,
  RealEstateInquiryType,
  RealEstateInquiryStatus,
  RealEstateSubmissionStatus,
} from '@prisma/client';

// Shared Enums mapping for Zod
const realEstateTypeEnum = z.nativeEnum(RealEstateType);
const realEstateStatusEnum = z.nativeEnum(RealEstateStatus);
const realEstateFinishingEnum = z.nativeEnum(RealEstateFinishing);
const realEstateInquiryTypeEnum = z.nativeEnum(RealEstateInquiryType);
const realEstateInquiryStatusEnum = z.nativeEnum(RealEstateInquiryStatus);
const realEstateSubmissionStatusEnum = z.nativeEnum(RealEstateSubmissionStatus);

// Images Validation
export const ImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().optional(),
  alt: z.string().optional(),
  isCover: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

// Create Public Inquiry
export const CreateRealEstateInquirySchema = z.object({
  listingId: z.string().uuid(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerWhatsapp: z.string().optional(),
  inquiryType: realEstateInquiryTypeEnum,
  message: z.string().optional(),
});

// Create Public Owner Submission
export const CreateOwnerSubmissionSchema = z.object({
  compoundId: z.string().uuid(),
  submitterName: z.string().min(2),
  submitterPhone: z.string().min(8),
  submitterWhatsapp: z.string().optional(),
  submitterEmail: z.string().email().optional().or(z.literal('')),
  type: realEstateTypeEnum,
  title: z.string().min(5),
  price: z.number().positive(),
  areaSqm: z.number().positive(),
  description: z.string().min(10),
  features: z.array(z.string()).optional(),
  
  // Apartment Fields
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  floor: z.number().int().optional(),
  buildingNumber: z.string().optional(),
  apartmentNumber: z.string().optional(),
  finishingType: realEstateFinishingEnum.optional(),
  hasElevator: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  
  // Land Fields
  pricePerMeter: z.number().positive().optional(),
  frontage: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  streetWidth: z.number().positive().optional(),
  landUse: z.string().optional(),
  utilitiesAvailable: z.boolean().optional(),
  cornerPlot: z.boolean().optional(),
  isRegistered: z.boolean().optional(),

  images: z.array(ImageSchema).max(12).optional(),
});

// Admin Create Listing
export const AdminCreateRealEstateListingSchema = z.object({
  compoundId: z.string().uuid(),
  type: realEstateTypeEnum,
  title: z.string().min(5),
  slug: z.string().min(3).optional(), // auto generated if missing
  status: realEstateStatusEnum.default(RealEstateStatus.DRAFT),
  price: z.number().positive(),
  areaSqm: z.number().positive(),
  description: z.string().min(10),
  features: z.array(z.string()).optional(),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().default(0),
  publishedAt: z.string().datetime().optional().nullable(),
  
  ownerName: z.string().min(2),
  ownerPhone: z.string().min(8),
  ownerWhatsapp: z.string().optional(),
  ownerEmail: z.string().email().optional().or(z.literal('')),
  internalNotes: z.string().optional(),
  
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  floor: z.number().int().optional(),
  buildingNumber: z.string().optional(),
  apartmentNumber: z.string().optional(),
  finishingType: realEstateFinishingEnum.optional(),
  deliveryStatus: z.string().optional(),
  hasElevator: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  view: z.string().optional(),
  
  pricePerMeter: z.number().positive().optional(),
  frontage: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  streetWidth: z.number().positive().optional(),
  landUse: z.string().optional(),
  utilitiesAvailable: z.boolean().optional(),
  cornerPlot: z.boolean().optional(),
  isRegistered: z.boolean().optional(),

  images: z.array(ImageSchema).max(20).optional(),
});

// Admin Update Listing
export const AdminUpdateRealEstateListingSchema = AdminCreateRealEstateListingSchema.partial();

// Admin Update Listing Status
export const AdminUpdateListingStatusSchema = z.object({
  status: realEstateStatusEnum,
});

// Admin Update Submission Status
export const AdminUpdateSubmissionStatusSchema = z.object({
  status: realEstateSubmissionStatusEnum,
  adminNotes: z.string().optional(),
});

// Admin Update Inquiry Status
export const AdminUpdateInquiryStatusSchema = z.object({
  status: realEstateInquiryStatusEnum,
});

// Query Schemas
export const PublicListingsQuerySchema = z.object({
  type: realEstateTypeEnum.optional(),
  compoundId: z.string().uuid().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minArea: z.coerce.number().positive().optional(),
  maxArea: z.coerce.number().positive().optional(),
});

export const AdminListingsQuerySchema = PublicListingsQuerySchema.extend({
  status: realEstateStatusEnum.optional(),
});
