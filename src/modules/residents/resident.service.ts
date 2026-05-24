import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import {
  getPaginationMeta,
  getPrismaPagination,
} from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  CreateResidentInput,
  ResidentQuery,
  UpdateResidentInput,
} from './resident.types.js';

const residentSelect = {
  id: true,
  compoundId: true,
  unitId: true,
  fullName: true,
  phone: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  compound: {
    select: {
      id: true,
      name: true,
    },
  },
  unit: {
    select: {
      id: true,
      unitNumber: true,
      unitType: true,
      status: true,
    },
  },
};

const residentDetailSelect = {
  ...residentSelect,
  _count: {
    select: {
      complaints: true,
    },
  },
};

export class ResidentService {
  static async listResidents(query: ResidentQuery) {
    const where: Prisma.ResidentWhereInput = {};

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.compoundId) {
      where.compoundId = query.compoundId;
    }

    if (query.unitId) {
      where.unitId = query.unitId;
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [totalCount, residents] = await prisma.$transaction([
      prisma.resident.count({ where }),
      prisma.resident.findMany({
        where,
        ...getPrismaPagination(query),
        select: residentSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      residents,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getResidentById(id: string) {
    const resident = await prisma.resident.findUnique({
      where: { id },
      select: residentDetailSelect,
    });

    if (!resident) {
      throw new AppError('Resident not found', 404, ErrorCodes.NOT_FOUND);
    }

    return resident;
  }

  static async createResident(data: CreateResidentInput) {
    await this.ensureCompoundExists(data.compoundId);

    if (data.unitId) {
      await this.ensureUnitBelongsToCompound(data.unitId, data.compoundId);
    }

    await this.ensurePhoneIsAvailable(data.compoundId, data.phone);

    try {
      return await prisma.resident.create({
        data,
        select: residentSelect,
      });
    } catch (error) {
      this.handleDuplicatePhone(error);
      throw error;
    }
  }

  static async updateResident(id: string, data: UpdateResidentInput) {
    const existingResident = await this.getResidentById(id);

    if (data.unitId !== undefined && data.unitId !== null) {
      await this.ensureUnitBelongsToCompound(data.unitId, existingResident.compoundId);
    }

    if (data.phone && data.phone !== existingResident.phone) {
      await this.ensurePhoneIsAvailable(existingResident.compoundId, data.phone, id);
    }

    try {
      return await prisma.resident.update({
        where: { id },
        data,
        select: residentSelect,
      });
    } catch (error) {
      this.handleDuplicatePhone(error);
      throw error;
    }
  }

  static async deleteResident(id: string) {
    const resident = await this.getResidentById(id);

    if (resident._count.complaints > 0) {
      throw new AppError(
        'Cannot delete a resident with related complaints',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    return prisma.resident.delete({
      where: { id },
      select: residentSelect,
    });
  }

  private static async ensureCompoundExists(compoundId: string) {
    const compound = await prisma.compound.findUnique({
      where: { id: compoundId },
      select: { id: true },
    });

    if (!compound) {
      throw new AppError('Compound not found', 404, ErrorCodes.NOT_FOUND);
    }
  }

  private static async ensureUnitBelongsToCompound(unitId: string, compoundId: string) {
    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        compoundId: true,
      },
    });

    if (!unit) {
      throw new AppError('Unit not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (unit.compoundId !== compoundId) {
      throw new AppError(
        'Unit does not belong to this compound',
        409,
        ErrorCodes.CONFLICT,
      );
    }
  }

  private static async ensurePhoneIsAvailable(
    compoundId: string,
    phone: string,
    excludeResidentId?: string,
  ) {
    const existingResident = await prisma.resident.findFirst({
      where: {
        compoundId,
        phone,
        ...(excludeResidentId ? { id: { not: excludeResidentId } } : {}),
      },
      select: { id: true },
    });

    if (existingResident) {
      throw new AppError(
        'Phone already exists in this compound',
        409,
        ErrorCodes.CONFLICT,
      );
    }
  }

  private static handleDuplicatePhone(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(
        'Phone already exists in this compound',
        409,
        ErrorCodes.CONFLICT,
      );
    }
  }
}
