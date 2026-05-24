import type { UnitStatus, UnitType } from '@prisma/client';

export interface CreateUnitInput {
  compoundId: string;
  unitNumber: string;
  unitType?: UnitType;
  floor?: number;
  areaSqm?: number;
  status?: UnitStatus;
}

export interface UpdateUnitInput {
  unitNumber?: string;
  unitType?: UnitType;
  floor?: number | null;
  areaSqm?: number | null;
  status?: UnitStatus;
}

export interface UnitQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  status?: UnitStatus;
  unitType?: UnitType;
}

export interface UnitParams {
  id: string;
}
