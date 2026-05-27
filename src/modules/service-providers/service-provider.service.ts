import { Prisma, ProviderStatus } from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import {
  getPaginationMeta,
  getPrismaPagination,
} from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  ServiceProviderParams,
  ServiceProviderQuery,
} from './service-provider.types.js';

const serviceProviderSelect = {
  id: true,
  compoundId: true,
  categoryId: true,
  name: true,
  description: true,
  phone: true,
  whatsappPhone: true,
  email: true,
  address: true,
  logoUrl: true,
  coverImageUrl: true,
  status: true,
  isFeatured: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  compound: {
    select: {
      id: true,
      name: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
    },
  },
} satisfies Prisma.ServiceProviderSelect;

export class ServiceProviderService {
  static async listServiceProviders(query: ServiceProviderQuery) {
    const where: Prisma.ServiceProviderWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.compoundId) {
      where.compoundId = query.compoundId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    // Default to ACTIVE only when caller has not explicitly requested a filter
    if (query.status !== undefined) {
      where.status = query.status;
    } else {
      where.status = ProviderStatus.ACTIVE;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    const [totalCount, providers] = await prisma.$transaction([
      prisma.serviceProvider.count({ where }),
      prisma.serviceProvider.findMany({
        where,
        ...getPrismaPagination(query),
        select: serviceProviderSelect,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    return {
      providers,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getServiceProviderById(id: ServiceProviderParams['id']) {
    const provider = await prisma.serviceProvider.findUnique({
      where: { id },
      select: serviceProviderSelect,
    });

    if (!provider) {
      throw new AppError(
        'Service provider not found',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    return provider;
  }
}
