import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import {
  getPaginationMeta,
  getPrismaPagination,
} from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  CompoundQuery,
  CreateCompoundInput,
  UpdateCompoundInput,
} from './compound.types.js';

export class CompoundService {
  static async listCompounds(query: CompoundQuery) {
    const where: Prisma.CompoundWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    where.isActive = query.isActive ?? true;

    const [totalCount, compounds] = await prisma.$transaction([
      prisma.compound.count({ where }),
      prisma.compound.findMany({
        where,
        ...getPrismaPagination(query),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      compounds,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getCompoundById(id: string) {
    const compound = await prisma.compound.findUnique({
      where: { id },
    });

    if (!compound) {
      throw new AppError('Compound not found', 404, ErrorCodes.NOT_FOUND);
    }

    const [units, residents, complaints] = await prisma.$transaction([
      prisma.unit.count({ where: { compoundId: id } }),
      prisma.resident.count({ where: { compoundId: id } }),
      prisma.complaint.count({ where: { compoundId: id } }),
    ]);

    return {
      ...compound,
      _count: {
        units,
        residents,
        complaints,
      },
    };
  }

  static async createCompound(data: CreateCompoundInput) {
    return prisma.compound.create({
      data,
    });
  }

  static async updateCompound(id: string, data: UpdateCompoundInput) {
    await this.getCompoundById(id);

    return prisma.compound.update({
      where: { id },
      data,
    });
  }

  static async deleteCompound(id: string) {
    const compound = await this.getCompoundById(id);
    const hasRelatedRecords =
      compound._count.units > 0 ||
      compound._count.residents > 0 ||
      compound._count.complaints > 0;

    if (hasRelatedRecords) {
      throw new AppError(
        'Cannot delete a compound with related units, residents, or complaints',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    if (!compound.isActive) {
      const inactiveCompound = await prisma.compound.findUniqueOrThrow({
        where: { id },
      });

      return {
        compound: inactiveCompound,
        alreadyInactive: true,
      };
    }

    const deactivatedCompound = await prisma.compound.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      compound: deactivatedCompound,
      alreadyInactive: false,
    };
  }
}
