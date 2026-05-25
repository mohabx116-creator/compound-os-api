export interface CreateCompoundInput {
  name: string;
  code?: string;
  adminEmail: string;
  address?: string;
  logoUrl?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdateCompoundInput {
  name?: string;
  code?: string;
  adminEmail?: string;
  address?: string;
  logoUrl?: string;
  phone?: string;
  isActive?: boolean;
}

export interface CompoundQuery {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}

export interface CompoundParams {
  id: string;
}
