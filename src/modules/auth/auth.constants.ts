import { ResidentRole } from '@prisma/client';

export const ADMIN_ROLES = [
  ResidentRole.ADMIN,
  ResidentRole.MANAGER,
  ResidentRole.ACCOUNTANT,
  ResidentRole.SECURITY,
  ResidentRole.MAINTENANCE,
] as const;

export const OWNER_ROLES = [
  ResidentRole.ADMIN,
] as const;

export const RESIDENT_ROLE = ResidentRole.RESIDENT;

export type AdminRole = (typeof ADMIN_ROLES)[number];
export type OwnerRole = (typeof OWNER_ROLES)[number];

export function isAdminRole(role: ResidentRole): role is AdminRole {
  return ADMIN_ROLES.includes(role as AdminRole);
}

export function isOwnerRole(role: ResidentRole): role is OwnerRole {
  return OWNER_ROLES.includes(role as OwnerRole);
}
