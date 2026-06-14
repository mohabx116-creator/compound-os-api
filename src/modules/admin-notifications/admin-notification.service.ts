import {
  AdminNotificationAudience,
  AdminNotificationEntityType,
  AdminNotificationEventType,
  Prisma,
} from '@prisma/client';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { getPaginationMeta, getPrismaPagination } from '../../common/utils/pagination.js';
import { prisma } from '../../config/prisma.js';
import type {
  AdminNotificationQuery,
  CreateAdminNotificationInput,
} from './admin-notification.types.js';

const adminNotificationSelect = {
  id: true,
  eventType: true,
  title: true,
  body: true,
  entityType: true,
  entityId: true,
  targetUrl: true,
  readAt: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AdminNotificationSelect;

export class AdminNotificationService {
  static async listAdminNotifications(query: AdminNotificationQuery, compoundId: string) {
    const where = this.buildAdminNotificationWhere(query, compoundId);

    const [totalCount, notifications] = await prisma.$transaction([
      prisma.adminNotification.count({ where }),
      prisma.adminNotification.findMany({
        where,
        ...getPrismaPagination(query),
        select: adminNotificationSelect,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      notifications,
      meta: getPaginationMeta(query, totalCount),
    };
  }

  static async getUnreadCount(compoundId: string) {
    const unreadCount = await prisma.adminNotification.count({
      where: {
        readAt: null,
        audience: AdminNotificationAudience.ADMIN,
        OR: [{ compoundId }, { compoundId: null }],
      },
    });

    return { unreadCount };
  }

  static async markNotificationRead(id: string, compoundId: string) {
    const notification = await prisma.adminNotification.findFirst({
      where: {
        id,
        audience: AdminNotificationAudience.ADMIN,
        OR: [{ compoundId }, { compoundId: null }],
      },
      select: adminNotificationSelect,
    });

    if (!notification) {
      throw new AppError('Admin notification not found', 404, ErrorCodes.NOT_FOUND);
    }

    if (notification.readAt) {
      return notification;
    }

    return prisma.adminNotification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
      select: adminNotificationSelect,
    });
  }

  static async markAllNotificationsRead(compoundId: string) {
    const result = await prisma.adminNotification.updateMany({
      where: {
        readAt: null,
        audience: AdminNotificationAudience.ADMIN,
        OR: [{ compoundId }, { compoundId: null }],
      },
      data: {
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  static async createAdminNotification(input: CreateAdminNotificationInput) {
    const dedupeKey = input.dedupeKey?.trim();

    if (dedupeKey) {
      const existing = await prisma.adminNotification.findUnique({
        where: { dedupeKey },
        select: adminNotificationSelect,
      });

      if (existing) {
        return existing;
      }
    }

    const data: Prisma.AdminNotificationUncheckedCreateInput = {
      compoundId: input.compoundId ?? undefined,
      audience: input.audience ?? AdminNotificationAudience.ADMIN,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? undefined,
      entityId: input.entityId ?? undefined,
      targetUrl: input.targetUrl ?? undefined,
      metadata: input.metadata ?? undefined,
      dedupeKey: dedupeKey || undefined,
    };

    try {
      return await prisma.adminNotification.create({
        data,
        select: adminNotificationSelect,
      });
    } catch (error) {
      if (
        dedupeKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await prisma.adminNotification.findUnique({
          where: { dedupeKey },
          select: adminNotificationSelect,
        });

        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  private static buildAdminNotificationWhere(
    query: AdminNotificationQuery,
    compoundId: string,
  ): Prisma.AdminNotificationWhereInput {
    const where: Prisma.AdminNotificationWhereInput = {
      audience: AdminNotificationAudience.ADMIN,
      OR: [{ compoundId }, { compoundId: null }],
    };

    if (query.unreadOnly) {
      where.readAt = null;
    }

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    return where;
  }
}

export { AdminNotificationAudience, AdminNotificationEntityType, AdminNotificationEventType };
