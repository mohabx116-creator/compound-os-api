import { z } from 'zod';
import {
  RealEstateStatus,
  RealEstateFinishing,
  RealEstateFinishingStatus,
  RealEstatePhase,
  RealEstateOwnershipProofType,
  RealEstateInquiryType,
  RealEstateInquiryStatus,
  RealEstateSubmissionStatus,
  RealEstateFurnishingStatus,
} from '@prisma/client';

// Shared Enums mapping for Zod
const realEstateStatusEnum = z.nativeEnum(RealEstateStatus);
const realEstateFinishingEnum = z.nativeEnum(RealEstateFinishing);
const realEstateFinishingStatusEnum = z.nativeEnum(RealEstateFinishingStatus);
const realEstatePhaseEnum = z.nativeEnum(RealEstatePhase);
const realEstateOwnershipProofTypeEnum = z.nativeEnum(RealEstateOwnershipProofType);
const realEstateFurnishingStatusEnum = z.nativeEnum(RealEstateFurnishingStatus);
const realEstateInquiryTypeEnum = z.nativeEnum(RealEstateInquiryType);
const realEstateInquiryStatusEnum = z.nativeEnum(RealEstateInquiryStatus);
const realEstateSubmissionStatusEnum = z.nativeEnum(RealEstateSubmissionStatus);
const realEstateFloorValues = [
  'GROUND',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  'ROOF',
] as const;
const realEstateFloorEnum = z.enum(realEstateFloorValues);
const realEstateAmenityValues = [
  'SURVEILLANCE_CAMERAS',
  'NATURAL_GAS',
  'WATER_METER',
  'GAS_METER',
  'AIR_CONDITIONERS',
  'ELECTRICAL_APPLIANCES',
] as const;
const realEstateAmenityEnum = z.enum(realEstateAmenityValues);

export const cloudinaryUploadSignatureSchema = z
  .object({
    folder: z.string().trim().max(200).optional(),
  })
  .strict();

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
  inquiryType: realEstateInquiryTypeEnum.default(RealEstateInquiryType.INTEREST),
  message: z.string().optional(),
});

export const CreateOwnerSubmissionSchema = z.object({
  submitterName: z.string().min(2),
  submitterPhone: z.string().min(8),
  submitterWhatsapp: z.string().optional(),
  submitterEmail: z.string().email().optional().or(z.literal('')),
  title: z.string().min(5),
  price: z.number().positive(),
  areaSqm: z.number().positive(),
  description: z.string().min(10),
  features: z.array(z.string()).optional(),
  amenities: z.array(realEstateAmenityEnum).optional(),
  
  // Apartment Fields
  bedrooms: z.number().int().nonnegative().optional(),
  bathrooms: z.number().int().nonnegative().optional(),
  floor: realEstateFloorEnum.optional(),
  balconies: z.number().int().nonnegative().optional(),
  receptionRooms: z.number().int().nonnegative().optional(),
  buildingAge: z.number().int().nonnegative().optional(),
  buildingNumber: z.string().optional(),
  apartmentNumber: z.string().optional(),
  finishingType: realEstateFinishingEnum.optional(),
  finishingStatus: realEstateFinishingStatusEnum.optional(),
  furnishingStatus: realEstateFurnishingStatusEnum.optional(),
  hasElevator: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  phase: realEstatePhaseEnum.optional(),
  ownershipProofType: realEstateOwnershipProofTypeEnum.optional(),
  areInstallmentsSettled: z.boolean().optional(),
  isDepositSettled: z.boolean().optional(),
  hasFinalContract: z.boolean().optional(),
  
  // Land Fields
  pricePerMeter: z.number().positive().optional(),
  frontage: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  streetWidth: z.number().positive().optional(),
  landUse: z.string().optional(),
  utilitiesAvailable: z.boolean().optional(),
  cornerPlot: z.boolean().optional(),
  isRegistered: z.boolean().optional(),
  hasBuildingPermit: z.boolean().optional(),

  images: z.array(ImageSchema).max(12).optional(),
});

// Admin Create Listing
export const AdminCreateRealEstateListingSchema = z.object({
  compoundId: z.string().uuid().optional(),
  title: z.string().min(5),
  slug: z.string().min(3).optional(), // auto generated if missing
  status: realEstateStatusEnum.default(RealEstateStatus.DRAFT),
  price: z.number().positive(),
  areaSqm: z.number().positive(),
  description: z.string().min(10),
  features: z.array(z.string()).optional(),
  amenities: z.array(realEstateAmenityEnum).optional(),
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
  floor: realEstateFloorEnum.optional(),
  balconies: z.number().int().nonnegative().optional(),
  receptionRooms: z.number().int().nonnegative().optional(),
  buildingAge: z.number().int().nonnegative().optional(),
  buildingNumber: z.string().optional(),
  apartmentNumber: z.string().optional(),
  finishingType: realEstateFinishingEnum.optional(),
  finishingStatus: realEstateFinishingStatusEnum.optional(),
  furnishingStatus: realEstateFurnishingStatusEnum.optional(),
  deliveryStatus: z.string().optional(),
  hasElevator: z.boolean().optional(),
  hasParking: z.boolean().optional(),
  view: z.string().optional(),
  phase: realEstatePhaseEnum.optional(),
  ownershipProofType: realEstateOwnershipProofTypeEnum.optional(),
  areInstallmentsSettled: z.boolean().optional(),
  isDepositSettled: z.boolean().optional(),
  hasFinalContract: z.boolean().optional(),
  
  pricePerMeter: z.number().positive().optional(),
  frontage: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  streetWidth: z.number().positive().optional(),
  landUse: z.string().optional(),
  utilitiesAvailable: z.boolean().optional(),
  cornerPlot: z.boolean().optional(),
  isRegistered: z.boolean().optional(),
  hasBuildingPermit: z.boolean().optional(),

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
  compoundId: z.string().uuid().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minArea: z.coerce.number().positive().optional(),
  maxArea: z.coerce.number().positive().optional(),
});

export const AdminListingsQuerySchema = PublicListingsQuerySchema.extend({
  status: realEstateStatusEnum.optional(),
});
