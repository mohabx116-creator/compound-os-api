import { prisma } from '../../config/prisma.js';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { hashPassword, verifyPassword } from '../auth/password.service.js';
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  UpdateCompoundSettingsInput,
} from './admin-settings.types.js';

export class AdminSettingsService {
  static async getSettings(adminId: string, compoundId: string) {
    const resident = await prisma.resident.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        compoundId: true,
      },
    });

    if (!resident) {
      throw new AppError('Admin profile not found', 404, ErrorCodes.NOT_FOUND);
    }

    const compound = await prisma.compound.findUnique({
      where: { id: compoundId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        adminEmail: true,
        logoUrl: true,
      },
    });

    if (!compound) {
      throw new AppError('Compound details not found', 404, ErrorCodes.NOT_FOUND);
    }

    return {
      user: {
        id: resident.id,
        name: resident.fullName,
        email: resident.email,
        phone: resident.phone,
        role: resident.role,
        compoundId: resident.compoundId,
      },
      compound: {
        id: compound.id,
        name: compound.name,
        slug: compound.code ?? '',
        address: compound.address ?? '',
        phone: compound.phone ?? '',
        whatsapp: null, // Field does not exist in the schema, return null as fallback
        email: compound.adminEmail,
        logoUrl: compound.logoUrl ?? '',
      },
    };
  }

  static async updateProfile(adminId: string, input: UpdateProfileInput) {
    const resident = await prisma.resident.findUnique({
      where: { id: adminId },
      select: { id: true },
    });

    if (!resident) {
      throw new AppError('Admin profile not found', 404, ErrorCodes.NOT_FOUND);
    }

    // Email uniqueness check: ensure email is not taken by another resident/admin (case-insensitive)
    if (input.email) {
      const emailConflict = await prisma.resident.findFirst({
        where: {
          email: {
            equals: input.email,
            mode: 'insensitive',
          },
          id: {
            not: adminId,
          },
        },
        select: { id: true },
      });

      if (emailConflict) {
        throw new AppError(
          'Email address is already in use by another user',
          409,
          ErrorCodes.CONFLICT,
        );
      }
    }

    const updatedResident = await prisma.resident.update({
      where: { id: adminId },
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        compoundId: true,
      },
    });

    return {
      id: updatedResident.id,
      name: updatedResident.fullName,
      email: updatedResident.email,
      phone: updatedResident.phone,
      role: updatedResident.role,
      compoundId: updatedResident.compoundId,
    };
  }

  static async changePassword(adminId: string, input: ChangePasswordInput) {
    const resident = await prisma.resident.findUnique({
      where: { id: adminId },
      select: { passwordHash: true },
    });

    if (!resident) {
      throw new AppError('Admin profile not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (!resident.passwordHash) {
      throw new AppError(
        'User has no password set. Please contact a super admin.',
        400,
        ErrorCodes.BAD_REQUEST,
      );
    }

    const isValidPassword = await verifyPassword(input.currentPassword, resident.passwordHash);
    if (!isValidPassword) {
      throw new AppError(
        'كلمة المرور الحالية غير صحيحة',
        401,
        ErrorCodes.UNAUTHORIZED,
      );
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await prisma.resident.update({
      where: { id: adminId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
      select: { id: true },
    });
  }

  static async updateCompound(compoundId: string, input: UpdateCompoundSettingsInput) {
    const compound = await prisma.compound.findUnique({
      where: { id: compoundId },
      select: { id: true },
    });

    if (!compound) {
      throw new AppError('Compound details not found', 404, ErrorCodes.NOT_FOUND);
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.adminEmail = input.email;
    if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl;

    const updatedCompound = await prisma.compound.update({
      where: { id: compoundId },
      data: updateData,
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        adminEmail: true,
        logoUrl: true,
      },
    });

    return {
      id: updatedCompound.id,
      name: updatedCompound.name,
      slug: updatedCompound.code ?? '',
      address: updatedCompound.address ?? '',
      phone: updatedCompound.phone ?? '',
      whatsapp: null,
      email: updatedCompound.adminEmail,
      logoUrl: updatedCompound.logoUrl ?? '',
    };
  }
}
