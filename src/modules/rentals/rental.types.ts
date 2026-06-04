import type {
  RentalFurnishingStatus,
  RentalInquiryStatus,
  RentalListingStatus,
  RentalListingType,
  RentalOwnerStatus,
  RentalOwnerSubmissionStatus,
} from '@prisma/client';

export interface RentalListQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  listingType?: RentalListingType;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  furnishingStatus?: RentalFurnishingStatus;
  featured?: boolean;
}

export interface AdminRentalListQuery extends RentalListQuery {
  status?: RentalListingStatus;
  ownerId?: string;
}

export interface RentalOwnerQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  status?: RentalOwnerStatus;
}

export interface RentalIdParams {
  id: string;
}

export interface RentalOwnerParams {
  id: string;
}

export interface RentalSlugParams {
  slug: string;
}

export interface TenantPaymentRequestInput {
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
}

export interface ContactAccessQuery {
  tenantPhone: string;
}

export interface OwnerSubmissionQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  status?: RentalOwnerSubmissionStatus;
}

export interface OwnerSubmissionParams {
  id: string;
}

export type RentalInquiryType = 'VIEWING_REQUEST' | 'GENERAL';

export interface CreateRentalInquiryInput {
  tenantName: string;
  tenantPhone: string;
  tenantEmail?: string;
  message?: string;
  inquiryType?: RentalInquiryType;
}

export interface RentalInquiryQuery {
  page: number;
  limit: number;
  search?: string;
  listingId?: string;
  compoundId?: string;
  status?: RentalInquiryStatus;
}

export interface RentalInquiryParams {
  id: string;
}

export interface UpdateRentalInquiryStatusInput {
  status: RentalInquiryStatus;
}

export interface AdminListingImageInput {
  url: string;
  publicId?: string;
  storagePath?: string;
  altText?: string;
  sortOrder?: number;
  isCover?: boolean;
}

export interface CreateOwnerSubmissionInput {
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  ownerNationalId?: string;
  preferredContactMethod?: string;
  listingType: RentalListingType;
  title: string;
  description: string;
  addressText?: string;
  locationText?: string;
  floor?: number | null;
  areaSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishingStatus: RentalFurnishingStatus;
  monthlyRent: number;
  depositAmount?: number;
  images: AdminListingImageInput[];
  policyAccepted: true;
}

export interface UpdateOwnerSubmissionStatusInput {
  status: RentalOwnerSubmissionStatus;
  adminNotes?: string;
  rejectionReason?: string;
}

export interface CloudinaryUploadSignatureInput {
  folder?: string;
}

export interface AdminCreateListingInput {
  compoundId: string;
  ownerId: string;
  unitId?: string;
  title: string;
  slug?: string;
  isFeatured?: boolean;
  description: string;
  listingType: RentalListingType;
  furnishingStatus: RentalFurnishingStatus;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  floor?: number | null;
  monthlyRent: number;
  depositAmount?: number;
  contactUnlockFee?: number;
  reservationFee?: number;
  platformCommissionRate?: number;
  addressText?: string;
  locationText?: string;
  images?: AdminListingImageInput[];
}

export type AdminUpdateListingInput = Partial<
  Omit<AdminCreateListingInput, 'compoundId' | 'ownerId' | 'images'>
> & {
  ownerId?: string;
  images?: AdminListingImageInput[];
};

export interface CreateRentalOwnerInput {
  compoundId: string;
  residentId?: string;
  fullName: string;
  phone: string;
  email?: string;
  nationalId?: string;
  status?: RentalOwnerStatus;
}

export type UpdateRentalOwnerInput = Partial<
  Omit<CreateRentalOwnerInput, 'compoundId'>
>;

export interface PaymobWebhookInput {
  body: Record<string, any>;
  query: Record<string, any>;
  rawBody?: string;
}
