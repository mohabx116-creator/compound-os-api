import {
  Prisma,
  ServiceItemStatus,
  ServiceItemKind,
} from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { getPaginationMeta, getPrismaPagination } from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  AdminServiceItemQuery,
  CreateServiceItemInput,
  PublicServiceItemQuery,
  UpdateServiceItemInput,
} from './services.types.js';

const DEFAULT_SERVICES_COMPOUND_CODE = 'black-horse';

const serviceItemPublicSelect = {
  id: true,
  compoundId: true,
  categoryId: true,
  kind: true,
  title: true,
  slug: true,
  shortDescription: true,
  description: true,
  imageUrl: true,
  images: true,
  address: true,
  googleMapsUrl: true,
  locationText: true,
  workingHours: true,
  phone: true,
  whatsapp: true,
  isPublic: true,
  isFeatured: true,
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
} satisfies Prisma.ServiceItemSelect;

const serviceItemAdminSelect = {
  ...serviceItemPublicSelect,
} satisfies Prisma.ServiceItemSelect;

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
    const compound = await this.resolveServicesCompound(query.compoundId);

    const items = await prisma.serviceItem.findMany({
      where: {
        compoundId: compound.id,
        status: ServiceItemStatus.ACTIVE,
        isPublic: true,
      },
      select: serviceItemPublicSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const homeItems = items.map((item) => ({
      ...item,
      images: item.images.slice(0, 1),
    }));

    const facilities = homeItems.filter((item) => item.kind === ServiceItemKind.FACILITY);
    const technicalServices = homeItems.filter((item) => item.kind === ServiceItemKind.TECHNICAL);
    const featured = homeItems.filter((item) => item.isFeatured === true);

    return {
      facilities,
      technicalServices,
      featured,
    };
  }

  static async listPublicItems(query: PublicServiceItemQuery) {
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
      },
      select: serviceItemPublicSelect,
    });

    if (!item) {
      throw new AppError('Service item not found', 404, ErrorCodes.NOT_FOUND);
    }

    return item;
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
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { locationText: { contains: query.search, mode: 'insensitive' } },
        { workingHours: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.kind) {
      where.kind = query.kind;
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
      select: serviceItemAdminSelect,
    });

    if (!item) {
      throw new AppError('Service item not found', 404, ErrorCodes.NOT_FOUND);
    }

    return item;
  }

  static async createAdminItem(input: CreateServiceItemInput) {
    const compound = await this.resolveServicesCompound(input.compoundId);
    const slug = await this.createUniqueItemSlug(compound.id, input.slug ?? input.title);

    try {
      return await prisma.serviceItem.create({
        data: {
          compoundId: compound.id,
          categoryId: input.categoryId ?? null,
          kind: input.kind,
          title: cleanText(input.title) ?? input.title.trim(),
          slug,
          shortDescription: cleanText(input.shortDescription) ?? null,
          description: cleanText(input.description) ?? null,
          imageUrl: cleanText(input.imageUrl) ?? null,
          images: input.images ?? [],
          address: cleanText(input.address) ?? null,
          googleMapsUrl: cleanText(input.googleMapsUrl) ?? null,
          locationText: cleanText(input.locationText) ?? null,
          workingHours: cleanText(input.workingHours) ?? null,
          phone: cleanText(input.phone) ?? null,
          whatsapp: cleanText(input.whatsapp) ?? null,
          isPublic: input.isPublic ?? true,
          isFeatured: input.isFeatured ?? false,
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

    const slug = input.slug
      ? await this.createUniqueItemSlug(existing.compoundId, input.slug, existing.id)
      : undefined;

    try {
      return await prisma.serviceItem.update({
        where: { id },
        data: {
          categoryId: input.categoryId !== undefined ? input.categoryId : undefined,
          kind: input.kind,
          title: input.title !== undefined ? cleanText(input.title) ?? input.title.trim() : undefined,
          slug,
          shortDescription: input.shortDescription !== undefined ? cleanText(input.shortDescription) : undefined,
          description: input.description !== undefined ? cleanText(input.description) : undefined,
          imageUrl: input.imageUrl !== undefined ? cleanText(input.imageUrl) : undefined,
          images: input.images !== undefined ? input.images : undefined,
          address: input.address !== undefined ? cleanText(input.address) : undefined,
          googleMapsUrl: input.googleMapsUrl !== undefined ? cleanText(input.googleMapsUrl) : undefined,
          locationText: input.locationText !== undefined ? cleanText(input.locationText) : undefined,
          workingHours: input.workingHours !== undefined ? cleanText(input.workingHours) : undefined,
          phone: input.phone !== undefined ? cleanText(input.phone) : undefined,
          whatsapp: input.whatsapp !== undefined ? cleanText(input.whatsapp) : undefined,
          isPublic: input.isPublic,
          isFeatured: input.isFeatured,
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
      select: { id: true },
    });

    if (!item) {
      throw new AppError('Service item not found', 404, ErrorCodes.NOT_FOUND);
    }

    await prisma.serviceItem.delete({ where: { id } });
    return { id };
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
    query: PublicServiceItemQuery,
    compoundId: string,
  ): Promise<Prisma.ServiceItemWhereInput> {
    const where: Prisma.ServiceItemWhereInput = {
      compoundId,
      status: ServiceItemStatus.ACTIVE,
      isPublic: true,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { shortDescription: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { locationText: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.featured) {
      where.isFeatured = true;
    }

    if (query.kind) {
      where.kind = query.kind;
    }

    return where;
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
