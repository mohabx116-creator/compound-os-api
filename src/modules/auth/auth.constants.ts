import { ResidentRole } from '@prisma/client';

export const ADMIN_ROLES = [
  ResidentRole.ADMIN,
  ResidentRole.MANAGER,
  ResidentRole.ACCOUNTANT,
  ResidentRole.SECURITY,
  ResidentRole.MAINTENANCE,
] as const;

export const RESIDENT_ROLE = ResidentRole.RESIDENT;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export function isAdminRole(role: ResidentRole): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}
