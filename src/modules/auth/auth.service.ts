import { Prisma, ResidentStatus } from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { env } from '../../config/env.js';
import { prisma } from '../../config/prisma.js';
import { isAdminRole } from './auth.constants.js';
import { signAccessToken } from './jwt.service.js';
import { verifyPassword } from './password.service.js';
import type {
  AdminLoginInput,
  AuthStatus,
  AuthTokenPayload,
  AuthUser,
  LoginResponse,
  ResidentLoginInput,
} from './auth.types.js';

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';

const authResidentSelect = Prisma.validator<Prisma.ResidentSelect>()({
  id: true,
  compoundId: true,
  unitId: true,
  fullName: true,
  phone: true,
  email: true,
  passwordHash: true,
  role: true,
  status: true,
  isPlatformOwner: true,
  failedLoginAttempts: true,
  lockedUntil: true,
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
    },
  },
});

type AuthResidentRecord =
  | Prisma.ResidentGetPayload<{ select: typeof authResidentSelect }>
  | null;

const authResidentSelectArgs = {
  select: authResidentSelect,
};

export class AuthService {
  static getStatus(): AuthStatus {
    return {
      authEnabled: true,
      phase: 'login-jwt',
      residentLogin: true,
      adminLogin: true,
    };
  }

  static async loginResident(input: ResidentLoginInput): Promise<LoginResponse> {
    const compound = await prisma.compound.findUnique({
      where: { code: input.compoundCode },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!compound?.isActive) {
      this.throwInvalidCredentials();
    }

    const resident = await prisma.resident.findFirst({
      where: {
        compoundId: compound.id,
        phone: this.normalizePhone(input.phone),
      },
      ...authResidentSelectArgs,
    });

    return this.authenticateResidentRecord(resident, input.password, {
      allowAdminRolesOnly: false,
    });
  }

  static async loginAdmin(input: AdminLoginInput): Promise<LoginResponse> {
    const residents = await prisma.resident.findMany({
      where: {
        email: {
          equals: input.email,
          mode: 'insensitive',
        },
      },
      take: 2,
      ...authResidentSelectArgs,
    });

    if (residents.length > 1) {
      throw new AppError(
        'Multiple users share this email. Use a more specific login strategy.',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    return this.authenticateResidentRecord(residents[0] ?? null, input.password, {
      allowAdminRolesOnly: true,
    });
  }

  static async getCurrentUser(payload: AuthTokenPayload): Promise<AuthUser> {
    const resident = await prisma.resident.findUnique({
      where: { id: payload.sub },
      ...authResidentSelectArgs,
    });

    if (
      !resident ||
      resident.status !== ResidentStatus.ACTIVE ||
      !resident.compound.isActive
    ) {
      throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
    }

    return this.toAuthUser(resident);
  }

  private static async authenticateResidentRecord(
    resident: AuthResidentRecord,
    password: string,
    options: { allowAdminRolesOnly: boolean },
  ): Promise<LoginResponse> {
    if (
      !resident ||
      resident.status !== ResidentStatus.ACTIVE ||
      !resident.compound.isActive ||
      (options.allowAdminRolesOnly && !isAdminRole(resident.role))
    ) {
      this.throwInvalidCredentials();
    }

    if (this.isLocked(resident.lockedUntil)) {
      this.throwInvalidCredentials();
    }

    if (!resident.passwordHash) {
      await this.recordFailedLogin(resident);
      this.throwInvalidCredentials();
    }

    const isValidPassword = await verifyPassword(password, resident.passwordHash);

    if (!isValidPassword) {
      await this.recordFailedLogin(resident);
      this.throwInvalidCredentials();
    }

    const user = this.toAuthUser(resident);
    const accessToken = signAccessToken({
      sub: resident.id,
      role: resident.role,
      compoundId: resident.compoundId,
      unitId: resident.unitId,
      isPlatformOwner: resident.isPlatformOwner,
      type: 'access',
    });

    await prisma.resident.update({
      where: { id: resident.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
      select: { id: true },
    });

    return {
      user,
      accessToken,
      expiresIn: env.JWT_EXPIRES_IN,
    };
  }

  private static async recordFailedLogin(
    resident: NonNullable<AuthResidentRecord>,
  ): Promise<void> {
    const failedLoginAttempts = resident.failedLoginAttempts + 1;
    const shouldLock = failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS;
    const lockedUntil = shouldLock
      ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
      : undefined;

    await prisma.resident.update({
      where: { id: resident.id },
      data: {
        failedLoginAttempts,
        ...(shouldLock ? { lockedUntil } : {}),
      },
      select: { id: true },
    });
  }

  private static toAuthUser(resident: NonNullable<AuthResidentRecord>): AuthUser {
    return {
      id: resident.id,
      fullName: resident.fullName,
      phone: resident.phone,
      email: resident.email,
      role: resident.role,
      status: resident.status,
      isPlatformOwner: resident.isPlatformOwner,
      compoundId: resident.compoundId,
      unitId: resident.unitId,
      compound: {
        id: resident.compound.id,
        name: resident.compound.name,
        code: resident.compound.code,
      },
      unit: resident.unit
        ? {
            id: resident.unit.id,
            unitNumber: resident.unit.unitNumber,
          }
        : null,
    };
  }

  private static normalizePhone(phone: string): string {
    return phone.trim().replace(/\s+/g, '');
  }

  private static isLocked(lockedUntil: Date | null): boolean {
    return lockedUntil !== null && lockedUntil.getTime() > Date.now();
  }

  private static throwInvalidCredentials(): never {
    throw new AppError(
      INVALID_CREDENTIALS_MESSAGE,
      401,
      ErrorCodes.UNAUTHORIZED,
    );
  }
}
