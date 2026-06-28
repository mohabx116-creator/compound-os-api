import { z } from 'zod';
import type {
  adminLoginSchema,
  authStatusResponseSchema,
  residentLoginSchema,
} from './auth.schema.js';

export type AuthStatus = z.infer<typeof authStatusResponseSchema>;
export type ResidentLoginInput = z.infer<typeof residentLoginSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export interface AuthTokenPayload {
  sub: string;
  role: string;
  compoundId: string;
  unitId?: string | null;
  isPlatformOwner?: boolean;
  type: 'access';
}

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: string;
  status: string;
  isPlatformOwner: boolean;
  compoundId: string;
  unitId: string | null;
  compound: {
    id: string;
    name: string;
    code: string | null;
  };
  unit: {
    id: string;
    unitNumber: string;
  } | null;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: string;
}
