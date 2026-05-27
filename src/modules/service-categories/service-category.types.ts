export interface ServiceCategoryQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  isActive?: boolean;
}

export interface ServiceCategoryParams {
  id: string;
}
