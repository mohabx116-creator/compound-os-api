import {
  AdminNotificationEntityType,
  AdminNotificationEventType,
  Prisma,
  ServiceItemStatus,
  ServiceRequestPriority,
} from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { getPaginationMeta, getPrismaPagination } from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import { AdminNotificationService } from '../admin-notifications/admin-notification.service.js';
import type {
  AdminServiceItemQuery,
  CreateServiceCategoryInput,
  CreateServiceItemInput,
  CreateServiceRequestInput,
  ServiceCategoryQuery,
  ServiceRequestQuery,
  UpdateServiceCategoryInput,
  UpdateServiceItemInput,
  UpdateServiceRequestStatusInput,
} from './services.types.js';

const DEFAULT_SERVICES_COMPOUND_CODE = 'black-horse';

const serviceCategoryBaseSelect = {
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
      code: true,
      isActive: true,
    },
  },
  _count: {
    select: {
      items: true,
    },
  },
} satisfies Prisma.ServiceCategorySelect;

const serviceItemPublicSelect = {
  id: true,
  compoundId: true,
  categoryId: true,
  title: true,
  slug: true,
  description: true,
  imageUrl: true,
  locationText: true,
  workingHours: true,
  phone: true,
  whatsapp: true,
  isPublic: true,
  isFeatured: true,
  acceptsRequests: true,
  sortOrder: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      isActive: true,
    },
  },
} satisfies Prisma.ServiceItemSelect;

const serviceItemAdminSelect = {
  ...serviceItemPublicSelect,
  _count: {
    select: {
      requests: true,
    },
  },
} satisfies Prisma.ServiceItemSelect;

const serviceRequestAdminSelect = {
  id: true,
  compoundId: true,
  serviceItemId: true,
  requesterName: true,
  requesterPhone: true,
  unitText: true,
  problemDescription: true,
  priority: true,
  status: true,
  preferredTime: true,
  imageUrl: true,
  adminNotes: true,
  createdAt: true,
  updatedAt: true,
  compound: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  serviceItem: {
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      isPublic: true,
      acceptsRequests: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.ServiceRequestSelect;

function cleanText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `service-${Date.now()}`;
}

export class ServicesService {
  static async getServicesHome(query: { compoundId?: string }) {
    const categories = await this.listPublicCategories(query);
    const [featured, latest] = await Promise.all([
      this.listPublicItems({
        compoundId: query.compoundId,
        featured: true,
        page: 1,
        limit: 6,
      }),
      this.listPublicItems({
        compoundId: query.compoundId,
        page: 1,
        limit: 6,
      }),
    ]);

    return {
      categories: categories.categories,
      featuredItems: featured.items,
      latestItems: latest.items,
    };
  }

  static async listPublicCategories(query: { compoundId?: string }) {
    const compound = await this.resolveServicesCompound(query.compoundId);

    const categories = await prisma.serviceCategory.findMany({
      where: {
        compoundId: compound.id,
        isActive: true,
        items: {
          some: {
            status: ServiceItemStatus.ACTIVE,
            isPublic: true,
          },
        },
      },
      select: serviceCategoryBaseSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return { categories };
  }

  static async getPublicCategoryBySlug(
    slug: string,
    query: { compoundId?: string },
) {
    const compound = await this.resolveServicesCompound(query.compoundId);

    const category = await prisma.serviceCategory.findFirst({
      where: {
        compoundId: compound.id,
        slug,
        isActive: true,
      },
      select: {
        ...serviceCategoryBaseSelect,
        items: {
          where: {
            isPublic: true,
            status: ServiceItemStatus.ACTIVE,
          },
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: serviceItemPublicSelect,
        },
      },
    });

    if (!category) {
      throw new AppError('Service category not found', 404, ErrorCodes.NOT_FOUND);
    }

    return category;
  }

  static async listPublicItems(query: {
    page: number;
    limit: number;
    search?: string;
    compoundId?: string;
    categorySlug?: string;
    featured?: boolean;
  }) {
    const compound = await this.resolveServicesCompound(query.compoundId);
    const where = await this.buildPublicItemWhere(query, compound.id);

    const [totalCount, items] = await prisma.$transaction([
      prisma.serviceItem.count({ where }),
      prisma.serviceItem.findMany({
        where,
        ...getPrismaPagination(query),
        select: serviceItemPublicSelect,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      items,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getPublicItemBySlug(
    slug: string,
    query: { compoundId?: string },
) {
    const compound = await this.resolveServicesCompound(query.compoundId);

    const item = await prisma.serviceItem.findFirst({
      where: {
        compoundId: compound.id,
        slug,
        status: ServiceItemStatus.ACTIVE,
        isPublic: true,
        category: {
          is: {
            isActive: true,
          },
        },
      },
      select: serviceItemPublicSelect,
    });

    if (!item) {
      throw new AppError('Service item not found', 404, ErrorCodes.NOT_FOUND);
    }

    return item;
  }

  static async createServiceRequest(
    serviceItemId: string,
    input: CreateServiceRequestInput,
  ) {
    const compound = await this.resolveServicesCompound();
    const serviceItem = await prisma.serviceItem.findFirst({
      where: {
        id: serviceItemId,
        compoundId: compound.id,
      },
      select: {
        id: true,
        compoundId: true,
        title: true,
        slug: true,
        status: true,
        isPublic: true,
        acceptsRequests: true,
        category: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!serviceItem) {
      throw new AppError('Service item not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (
      serviceItem.status !== ServiceItemStatus.ACTIVE ||
      !serviceItem.isPublic ||
      !serviceItem.acceptsRequests ||
      !serviceItem.category.isActive
    ) {
      throw new AppError(
        'Service item is not accepting requests',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    const request = await prisma.serviceRequest.create({
      data: {
        compoundId: serviceItem.compoundId,
        serviceItemId: serviceItem.id,
        requesterName: cleanText(input.requesterName) ?? input.requesterName.trim(),
        requesterPhone: cleanText(input.requesterPhone) ?? input.requesterPhone.trim(),
        unitText: cleanText(input.unitText) ?? null,
        problemDescription: cleanText(input.problemDescription) ?? input.problemDescription.trim(),
        priority: input.priority ?? ServiceRequestPriority.NORMAL,
        preferredTime: cleanText(input.preferredTime) ?? null,
        imageUrl: cleanText(input.imageUrl) ?? null,
      },
      select: serviceRequestAdminSelect,
    });

    void this.emitAdminNotificationSafely({
      compoundId: serviceItem.compoundId,
      eventType: AdminNotificationEventType.SERVICE_REQUEST_CREATED,
      title: 'طلب خدمة جديد',
      body: `تم استقبال طلب خدمة جديد من ${request.requesterName} على خدمة ${serviceItem.title}.`,
      entityType: AdminNotificationEntityType.SERVICE_REQUEST,
      entityId: request.id,
      targetUrl: `/services/requests/${request.id}`,
      metadata: {
        requesterName: request.requesterName,
        requesterPhone: request.requesterPhone,
        serviceItemId: request.serviceItemId,
        serviceTitle: serviceItem.title,
        priority: request.priority,
      },
      dedupeKey: `service-request-created:${request.id}`,
    });

    return request;
  }

  static async listAdminCategories(query: ServiceCategoryQuery) {
    const compound = await this.resolveServicesCompound(query.compoundId);
    const where: Prisma.ServiceCategoryWhereInput = {
      compoundId: compound.id,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { icon: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [totalCount, categories] = await prisma.$transaction([
      prisma.serviceCategory.count({ where }),
      prisma.serviceCategory.findMany({
        where,
        ...getPrismaPagination(query),
        select: serviceCategoryBaseSelect,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    return {
      categories,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getAdminCategoryById(id: string) {
    const compound = await this.resolveServicesCompound();
    const category = await prisma.serviceCategory.findFirst({
      where: {
        id,
        compoundId: compound.id,
      },
      select: {
        ...serviceCategoryBaseSelect,
        items: {
          orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: serviceItemAdminSelect,
        },
      },
    });

    if (!category) {
      throw new AppError('Service category not found', 404, ErrorCodes.NOT_FOUND);
    }

    return category;
  }

  static async createAdminCategory(input: CreateServiceCategoryInput) {
    const compound = await this.resolveServicesCompound(input.compoundId);
    const slug = await this.createUniqueCategorySlug(compound.id, input.slug ?? input.name);

    try {
      return await prisma.serviceCategory.create({
        data: {
          compoundId: compound.id,
          name: cleanText(input.name) ?? input.name.trim(),
          slug,
          description: cleanText(input.description) ?? null,
          icon: cleanText(input.icon) ?? null,
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive ?? true,
        },
        select: serviceCategoryBaseSelect,
      });
    } catch (error) {
      this.handleUniqueConstraint(error, 'Service category');
      throw error;
    }
  }

  static async updateAdminCategory(id: string, input: UpdateServiceCategoryInput) {
    const compound = await this.resolveServicesCompound();
    const existing = await prisma.serviceCategory.findFirst({
      where: {
        id,
        compoundId: compound.id,
      },
    });

    if (!existing) {
      throw new AppError('Service category not found', 404, ErrorCodes.NOT_FOUND);
    }

    const slug = input.slug
      ? await this.createUniqueCategorySlug(existing.compoundId, input.slug, existing.id)
      : undefined;

    try {
      return await prisma.serviceCategory.update({
        where: { id },
        data: {
          name: input.name !== undefined ? cleanText(input.name) ?? input.name.trim() : undefined,
          slug,
          description: input.description !== undefined ? cleanText(input.description) ?? null : undefined,
          icon: input.icon !== undefined ? cleanText(input.icon) ?? null : undefined,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
        },
        select: serviceCategoryBaseSelect,
      });
    } catch (error) {
      this.handleUniqueConstraint(error, 'Service category');
      throw error;
    }
  }

  static async deleteAdminCategory(id: string) {
    const compound = await this.resolveServicesCompound();
    const category = await prisma.serviceCategory.findFirst({
      where: {
        id,
        compoundId: compound.id,
      },
      select: { id: true, _count: { select: { items: true } } },
    });

    if (!category) {
      throw new AppError('Service category not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (category._count.items > 0) {
      throw new AppError(
        'Cannot delete a category that still has service items',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    await prisma.serviceCategory.delete({ where: { id } });
    return { id };
  }

  static async listAdminItems(query: AdminServiceItemQuery) {
    const compound = await this.resolveServicesCompound(query.compoundId);
    const where: Prisma.ServiceItemWhereInput = {
      compoundId: compound.id,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { locationText: { contains: query.search, mode: 'insensitive' } },
        { workingHours: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic;
    }

    if (query.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query.acceptsRequests !== undefined) {
      where.acceptsRequests = query.acceptsRequests;
    }

    const [totalCount, items] = await prisma.$transaction([
      prisma.serviceItem.count({ where }),
      prisma.serviceItem.findMany({
        where,
        ...getPrismaPagination(query),
        select: serviceItemAdminSelect,
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      items,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getAdminItemById(id: string) {
    const compound = await this.resolveServicesCompound();
    const item = await prisma.serviceItem.findFirst({
      where: {
        id,
        compoundId: compound.id,
      },
      select: {
        ...serviceItemAdminSelect,
        requests: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: serviceRequestAdminSelect,
        },
      },
    });

    if (!item) {
      throw new AppError('Service item not found', 404, ErrorCodes.NOT_FOUND);
    }

    return item;
  }

  static async createAdminItem(input: CreateServiceItemInput) {
    const compound = await this.resolveServicesCompound(input.compoundId);
    const category = await this.resolveServiceCategoryForCompound(input.categoryId, compound.id);
    const slug = await this.createUniqueItemSlug(compound.id, input.slug ?? input.title);

    try {
      return await prisma.serviceItem.create({
        data: {
          compoundId: compound.id,
          categoryId: category.id,
          title: cleanText(input.title) ?? input.title.trim(),
          slug,
          description: cleanText(input.description) ?? null,
          imageUrl: cleanText(input.imageUrl) ?? null,
          locationText: cleanText(input.locationText) ?? null,
          workingHours: cleanText(input.workingHours) ?? null,
          phone: cleanText(input.phone) ?? null,
          whatsapp: cleanText(input.whatsapp) ?? null,
          isPublic: input.isPublic ?? true,
          isFeatured: input.isFeatured ?? false,
          acceptsRequests: input.acceptsRequests ?? true,
          sortOrder: input.sortOrder ?? 0,
          status: input.status ?? ServiceItemStatus.ACTIVE,
        },
        select: serviceItemAdminSelect,
      });
    } catch (error) {
      this.handleUniqueConstraint(error, 'Service item');
      throw error;
    }
  }

  static async updateAdminItem(id: string, input: UpdateServiceItemInput) {
    const compound = await this.resolveServicesCompound();
    const existing = await prisma.serviceItem.findFirst({
      where: {
        id,
        compoundId: compound.id,
      },
      select: { id: true, compoundId: true },
    });

    if (!existing) {
      throw new AppError('Service item not found', 404, ErrorCodes.NOT_FOUND);
    }

    const category = input.categoryId
      ? await this.resolveServiceCategoryForCompound(input.categoryId, existing.compoundId)
      : null;

    const slug = input.slug
      ? await this.createUniqueItemSlug(existing.compoundId, input.slug, existing.id)
      : undefined;

    try {
      return await prisma.serviceItem.update({
        where: { id },
        data: {
          categoryId: category?.id,
          title: input.title !== undefined ? cleanText(input.title) ?? input.title.trim() : undefined,
          slug,
          description: input.description !== undefined ? cleanText(input.description) ?? null : undefined,
          imageUrl: input.imageUrl !== undefined ? cleanText(input.imageUrl) ?? null : undefined,
          locationText: input.locationText !== undefined ? cleanText(input.locationText) ?? null : undefined,
          workingHours: input.workingHours !== undefined ? cleanText(input.workingHours) ?? null : undefined,
          phone: input.phone !== undefined ? cleanText(input.phone) ?? null : undefined,
          whatsapp: input.whatsapp !== undefined ? cleanText(input.whatsapp) ?? null : undefined,
          isPublic: input.isPublic,
          isFeatured: input.isFeatured,
          acceptsRequests: input.acceptsRequests,
          sortOrder: input.sortOrder,
          status: input.status,
        },
        select: serviceItemAdminSelect,
      });
    } catch (error) {
      this.handleUniqueConstraint(error, 'Service item');
      throw error;
    }
  }

  static async deleteAdminItem(id: string) {
    const compound = await this.resolveServicesCompound();
    const item = await prisma.serviceItem.findFirst({
      where: {
        id,
        compoundId: compound.id,
      },
      select: { id: true, _count: { select: { requests: true } } },
    });

    if (!item) {
      throw new AppError('Service item not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (item._count.requests > 0) {
      throw new AppError(
        'Cannot delete a service item that already has requests',
        409,
        ErrorCodes.CONFLICT,
      );
    }

    await prisma.serviceItem.delete({ where: { id } });
    return { id };
  }

  static async listAdminRequests(query: ServiceRequestQuery) {
    const compound = await this.resolveServicesCompound(query.compoundId);
    const where: Prisma.ServiceRequestWhereInput = {
      compoundId: compound.id,
    };

    if (query.search) {
      where.OR = [
        { requesterName: { contains: query.search, mode: 'insensitive' } },
        { requesterPhone: { contains: query.search, mode: 'insensitive' } },
        { unitText: { contains: query.search, mode: 'insensitive' } },
        { problemDescription: { contains: query.search, mode: 'insensitive' } },
        { serviceItem: { is: { title: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    if (query.serviceItemId) {
      where.serviceItemId = query.serviceItemId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    const [totalCount, requests] = await prisma.$transaction([
      prisma.serviceRequest.count({ where }),
      prisma.serviceRequest.findMany({
        where,
        ...getPrismaPagination(query),
        select: serviceRequestAdminSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      requests,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getAdminRequestById(id: string) {
    const compound = await this.resolveServicesCompound();
    const request = await prisma.serviceRequest.findFirst({
      where: {
        id,
        compoundId: compound.id,
      },
      select: serviceRequestAdminSelect,
    });

    if (!request) {
      throw new AppError('Service request not found', 404, ErrorCodes.NOT_FOUND);
    }

    return request;
  }

  static async updateAdminRequestStatus(id: string, input: UpdateServiceRequestStatusInput) {
    const compound = await this.resolveServicesCompound();
    const request = await prisma.serviceRequest.findFirst({
      where: {
        id,
        compoundId: compound.id,
      },
      select: { id: true },
    });

    if (!request) {
      throw new AppError('Service request not found', 404, ErrorCodes.NOT_FOUND);
    }

    return prisma.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: input.status,
        adminNotes: input.adminNotes !== undefined ? cleanText(input.adminNotes) ?? null : undefined,
      },
      select: serviceRequestAdminSelect,
    });
  }

  private static async resolveServicesCompound(
    compoundId?: string,
  ) {
    const compound = compoundId
      ? await prisma.compound.findUnique({ where: { id: compoundId } })
      : await prisma.compound.findFirst({
          where: {
            code: DEFAULT_SERVICES_COMPOUND_CODE,
            isActive: true,
          },
        });

    if (!compound || !compound.isActive) {
      throw new AppError('Active compound not found', 404, ErrorCodes.NOT_FOUND);
    }

    return compound;
  }

  private static async resolveServiceCategoryForCompound(categoryId: string, compoundId: string) {
    const category = await prisma.serviceCategory.findFirst({
      where: {
        id: categoryId,
        compoundId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new AppError('Service category not found', 404, ErrorCodes.NOT_FOUND);
    }

    return category;
  }

  private static async createUniqueCategorySlug(
    compoundId: string,
    value: string,
    currentId?: string,
  ) {
    const baseSlug = slugify(value);
    let slug = baseSlug;
    let suffix = 2;

    while (await prisma.serviceCategory.findFirst({
      where: {
        compoundId,
        slug,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private static async createUniqueItemSlug(
    compoundId: string,
    value: string,
    currentId?: string,
  ) {
    const baseSlug = slugify(value);
    let slug = baseSlug;
    let suffix = 2;

    while (await prisma.serviceItem.findFirst({
      where: {
        compoundId,
        slug,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private static async buildPublicItemWhere(
    query: {
      search?: string;
      categorySlug?: string;
      featured?: boolean;
    },
    compoundId: string,
  ): Promise<Prisma.ServiceItemWhereInput> {
    const where: Prisma.ServiceItemWhereInput = {
      compoundId,
      status: ServiceItemStatus.ACTIVE,
      isPublic: true,
      category: {
        is: {
          isActive: true,
        },
      },
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { locationText: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.featured) {
      where.isFeatured = true;
    }

    if (query.categorySlug) {
      const category = await prisma.serviceCategory.findFirst({
        where: {
          compoundId,
          slug: query.categorySlug,
          isActive: true,
        },
        select: { id: true },
      });

      if (!category) {
        throw new AppError('Service category not found', 404, ErrorCodes.NOT_FOUND);
      }

      where.categoryId = category.id;
    }

    return where;
  }

  private static async emitAdminNotificationSafely(
    input: Parameters<typeof AdminNotificationService.createAdminNotification>[0],
  ) {
    try {
      await AdminNotificationService.createAdminNotification(input);
    } catch (error) {
      console.warn('[services] Failed to emit admin notification', {
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        error,
      });
    }
  }

  private static handleUniqueConstraint(error: unknown, entityLabel: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AppError(
        `${entityLabel} already exists`,
        409,
        ErrorCodes.CONFLICT,
      );
    }
  }
}
