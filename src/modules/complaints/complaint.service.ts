import { ComplaintStatus, Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import {
  getPaginationMeta,
  getPrismaPagination,
} from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  ComplaintQuery,
  CreateComplaintInput,
  UpdateComplaintInput,
} from './complaint.types.js';

const complaintSelect = {
  id: true,
  compoundId: true,
  residentId: true,
  unitId: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  compound: {
    select: {
      id: true,
      name: true,
    },
  },
  resident: {
    select: {
      id: true,
      fullName: true,
      phone: true,
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

export class ComplaintService {
  static async listComplaints(query: ComplaintQuery) {
    const where: Prisma.ComplaintWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.compoundId) {
      where.compoundId = query.compoundId;
    }

    if (query.residentId) {
      where.residentId = query.residentId;
    }

    if (query.unitId) {
      where.unitId = query.unitId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    const [totalCount, complaints] = await prisma.$transaction([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        ...getPrismaPagination(query),
        select: complaintSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      complaints,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getComplaintById(id: string) {
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: complaintSelect,
    });

    if (!complaint) {
      throw new AppError('Complaint not found', 404, ErrorCodes.NOT_FOUND);
    }

    return complaint;
  }

  static async createComplaint(data: CreateComplaintInput) {
    await this.ensureCompoundExists(data.compoundId);
    await this.ensureResidentBelongsToCompound(data.residentId, data.compoundId);

    if (data.unitId) {
      await this.ensureUnitBelongsToCompound(data.unitId, data.compoundId);
    }

    return prisma.complaint.create({
      data,
      select: complaintSelect,
    });
  }

  static async updateComplaint(id: string, data: UpdateComplaintInput) {
    const existingComplaint = await this.getComplaintById(id);

    if (data.unitId !== undefined && data.unitId !== null) {
      await this.ensureUnitBelongsToCompound(
        data.unitId,
        existingComplaint.compoundId,
      );
    }

    return prisma.complaint.update({
      where: { id },
      data,
      select: complaintSelect,
    });
  }

  static async closeComplaint(id: string) {
    const complaint = await this.getComplaintById(id);

    if (complaint.status === ComplaintStatus.CLOSED) {
      return {
        complaint,
        alreadyClosed: true,
      };
    }

    const closedComplaint = await prisma.complaint.update({
      where: { id },
      data: { status: ComplaintStatus.CLOSED },
      select: complaintSelect,
    });

    return {
      complaint: closedComplaint,
      alreadyClosed: false,
    };
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

  private static async ensureResidentBelongsToCompound(
    residentId: string,
    compoundId: string,
  ) {
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      select: {
        id: true,
        compoundId: true,
      },
    });

    if (!resident) {
      throw new AppError('Resident not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (resident.compoundId !== compoundId) {
      throw new AppError(
        'Resident does not belong to this compound',
        409,
        ErrorCodes.CONFLICT,
      );
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
}
