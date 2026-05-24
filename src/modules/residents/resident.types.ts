import type { ResidentRole, ResidentStatus } from '@prisma/client';

export interface CreateResidentInput {
  compoundId: string;
  unitId?: string;
  fullName: string;
  phone: string;
  email?: string;
  role?: ResidentRole;
  status?: ResidentStatus;
}

export interface UpdateResidentInput {
  unitId?: string | null;
  fullName?: string;
  phone?: string;
  email?: string | null;
  role?: ResidentRole;
  status?: ResidentStatus;
}

export interface ResidentQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  unitId?: string;
  role?: ResidentRole;
  status?: ResidentStatus;
}

export interface ResidentParams {
  id: string;
}
