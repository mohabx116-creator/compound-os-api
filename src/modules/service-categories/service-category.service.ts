import { Prisma } from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import {
  getPaginationMeta,
  getPrismaPagination,
} from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  ServiceCategoryParams,
  ServiceCategoryQuery,
} from './service-category.types.js';

const serviceCategorySelect = {
  id: true,
  compoundId: true,
  name: true,
  slug: true,
  description: true,
  icon: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  compound: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      providers: true,
    },
  },
} satisfies Prisma.ServiceCategorySelect;

export class ServiceCategoryService {
  static async listServiceCategories(query: ServiceCategoryQuery) {
    const where: Prisma.ServiceCategoryWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.compoundId) {
      where.compoundId = query.compoundId;
    }

    // Default to active only when caller has not explicitly requested a filter
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else {
      where.isActive = true;
    }

    const [totalCount, categories] = await prisma.$transaction([
      prisma.serviceCategory.count({ where }),
      prisma.serviceCategory.findMany({
        where,
        ...getPrismaPagination(query),
        select: serviceCategorySelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    return {
      categories,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getServiceCategoryById(id: ServiceCategoryParams['id']) {
    const category = await prisma.serviceCategory.findUnique({
      where: { id },
      select: serviceCategorySelect,
    });

    if (!category) {
      throw new AppError(
        'Service category not found',
        404,
        ErrorCodes.NOT_FOUND,
      );
    }

    return category;
  }
}
