import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import {
  getPaginationMeta,
  getPrismaPagination,
} from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  CreateUnitInput,
  UnitQuery,
  UpdateUnitInput,
} from './unit.types.js';

const unitInclude = {
  compound: {
    select: {
      id: true,
      name: true,
    },
  },
};

const unitDetailInclude = {
  ...unitInclude,
  _count: {
    select: {
      residents: true,
      complaints: true,
    },
  },
};

export class UnitService {
  static async listUnits(query: UnitQuery) {
    const where: Prisma.UnitWhereInput = {};

    if (query.search) {
      where.unitNumber = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    if (query.compoundId) {
      where.compoundId = query.compoundId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.unitType) {
      where.unitType = query.unitType;
    }

    const [totalCount, units] = await prisma.$transaction([
      prisma.unit.count({ where }),
      prisma.unit.findMany({
        where,
        ...getPrismaPagination(query),
        include: unitInclude,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      units,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getUnitById(id: string) {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: unitDetailInclude,
    });

    if (!unit) {
      throw new AppError('Unit not found', 404, ErrorCodes.NOT_FOUND);
    }

    return unit;
  }

  static async createUnit(data: CreateUnitInput) {
    await this.ensureCompoundExists(data.compoundId);
    await this.ensureUnitNumberIsAvailable(data.compoundId, data.unitNumber);

    try {
      return await prisma.unit.create({
        data,
        include: unitInclude,
      });
    } catch (error) {
      this.handleDuplicateUnitNumber(error);
      throw error;
    }
  }

  static async updateUnit(id: string, data: UpdateUnitInput) {
    const existingUnit = await this.getUnitById(id);

    if (data.unitNumber && data.unitNumber !== existingUnit.unitNumber) {
      await this.ensureUnitNumberIsAvailable(existingUnit.compoundId, data.unitNumber, id);
    }

    try {
      return await prisma.unit.update({
        where: { id },
        data,
        include: unitInclude,
      });
    } catch (error) {
      this.handleDuplicateUnitNumber(error);
      throw error;
    }
  }

  static async deleteUnit(id: string) {
    const unit = await this.getUnitById(id);
    const hasRelatedRecords =
      unit._count.residents > 0 ||
      unit._count.complaints > 0;

    if (hasRelatedRecords) {
      throw new AppError(
        'Cannot delete a unit with related residents or complaints',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    return prisma.unit.delete({
      where: { id },
      include: unitInclude,
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

  private static async ensureUnitNumberIsAvailable(
    compoundId: string,
    unitNumber: string,
    excludeUnitId?: string,
  ) {
    const existingUnit = await prisma.unit.findFirst({
      where: {
        compoundId,
        unitNumber,
        ...(excludeUnitId ? { id: { not: excludeUnitId } } : {}),
      },
      select: { id: true },
    });

    if (existingUnit) {
      throw new AppError(
        'Unit number already exists in this compound',
        409,
        ErrorCodes.CONFLICT,
      );
    }
  }

  private static handleDuplicateUnitNumber(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(
        'Unit number already exists in this compound',
        409,
        ErrorCodes.CONFLICT,
      );
    }
  }
}
