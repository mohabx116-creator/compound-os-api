import type { ProviderStatus } from '@prisma/client';

export interface ServiceProviderQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  categoryId?: string;
  status?: ProviderStatus;
  isFeatured?: boolean;
}

export interface ServiceProviderParams {
  id: string;
}
