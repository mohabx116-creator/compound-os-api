import type {
  ServiceItemStatus,
  ServiceItemKind,
  ServiceItemType,
} from '@prisma/client';

export interface ServicesCompoundParams {
  compoundId?: string;
}

export interface PublicServiceItemQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  kind?: ServiceItemKind;
  serviceType?: ServiceItemType;
  featured?: boolean;
}

export interface AdminServiceItemQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  categoryId?: string;
  kind?: ServiceItemKind;
  serviceType?: ServiceItemType;
  status?: ServiceItemStatus;
  isPublic?: boolean;
  isFeatured?: boolean;
}

export interface ServiceItemIdParams {
  id: string;
}

export interface ServiceItemSlugParams {
  slug: string;
}

export interface CreateServiceItemInput {
  compoundId?: string;
  categoryId?: string;
  kind: ServiceItemKind;
  serviceType?: ServiceItemType;
  title: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  address?: string;
  googleMapsUrl?: string;
  locationText?: string;
  workingHours?: string;
  phone?: string;
  whatsapp?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  status?: ServiceItemStatus;
}

export interface UpdateServiceItemInput {
  categoryId?: string;
  kind?: ServiceItemKind;
  serviceType?: ServiceItemType;
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  address?: string;
  googleMapsUrl?: string;
  locationText?: string;
  workingHours?: string;
  phone?: string;
  whatsapp?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  status?: ServiceItemStatus;
}
