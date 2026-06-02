import type {
  RentalFurnishingStatus,
  RentalListingStatus,
  RentalListingType,
  RentalOwnerStatus,
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

export interface AdminListingImageInput {
  url: string;
  altText?: string;
  sortOrder?: number;
  isCover?: boolean;
}

export interface AdminCreateListingInput {
  compoundId: string;
  ownerId: string;
  unitId?: string;
  title: string;
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
