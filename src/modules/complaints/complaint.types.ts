import type { ComplaintPriority, ComplaintStatus } from '@prisma/client';

export interface CreateComplaintInput {
  compoundId: string;
  residentId: string;
  unitId?: string;
  title: string;
  description: string;
  priority?: ComplaintPriority;
  status?: ComplaintStatus;
}

export interface UpdateComplaintInput {
  unitId?: string | null;
  title?: string;
  description?: string;
  priority?: ComplaintPriority;
  status?: ComplaintStatus;
}

export interface ComplaintQuery {
  page: number;
  limit: number;
  search?: string;
  compoundId?: string;
  residentId?: string;
  unitId?: string;
  status?: ComplaintStatus;
  priority?: ComplaintPriority;
}

export interface ComplaintParams {
  id: string;
}
