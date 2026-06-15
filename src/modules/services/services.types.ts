import type {
  ServiceItemStatus,
  ServiceRequestPriority,
  ServiceRequestStatus,
} from '@prisma/client';

export interface ServicesCompoundParams {
  compoundId?: string;
}

export interface ServiceCategoryQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  isActive?: boolean;
}

export interface PublicServiceItemQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  categorySlug?: string;
  featured?: boolean;
}

export interface AdminServiceItemQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  categoryId?: string;
  status?: ServiceItemStatus;
  isPublic?: boolean;
  isFeatured?: boolean;
  acceptsRequests?: boolean;
}

export interface ServiceRequestQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  serviceItemId?: string;
  status?: ServiceRequestStatus;
  priority?: ServiceRequestPriority;
}

export interface ServiceCategoryIdParams {
  id: string;
}

export interface ServiceCategorySlugParams {
  slug: string;
}

export interface ServiceItemIdParams {
  id: string;
}

export interface ServiceItemSlugParams {
  slug: string;
}

export interface ServiceRequestIdParams {
  id: string;
}

export interface CreateServiceCategoryInput {
  compoundId?: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateServiceCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateServiceItemInput {
  compoundId?: string;
  categoryId: string;
  title: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  locationText?: string;
  workingHours?: string;
  phone?: string;
  whatsapp?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  acceptsRequests?: boolean;
  sortOrder?: number;
  status?: ServiceItemStatus;
}

export interface UpdateServiceItemInput {
  categoryId?: string;
  title?: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  locationText?: string;
  workingHours?: string;
  phone?: string;
  whatsapp?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  acceptsRequests?: boolean;
  sortOrder?: number;
  status?: ServiceItemStatus;
}

export interface CreateServiceRequestInput {
  requesterName: string;
  requesterPhone: string;
  unitText?: string;
  problemDescription: string;
  priority?: ServiceRequestPriority;
  preferredTime?: string;
  imageUrl?: string;
}

export interface UpdateServiceRequestStatusInput {
  status: ServiceRequestStatus;
  adminNotes?: string;
}
