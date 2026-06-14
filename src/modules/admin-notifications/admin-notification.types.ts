import type {
  AdminNotificationAudience,
  AdminNotificationEntityType,
  AdminNotificationEventType,
  Prisma,
} from '@prisma/client';

export interface AdminNotificationQuery {
  page: number;
  limit: number;
  unreadOnly?: boolean;
  eventType?: AdminNotificationEventType;
  entityType?: AdminNotificationEntityType;
}

export interface AdminNotificationParams {
  id: string;
}

export interface CreateAdminNotificationInput {
  compoundId?: string | null;
  audience?: AdminNotificationAudience;
  eventType: AdminNotificationEventType;
  title: string;
  body: string;
  entityType?: AdminNotificationEntityType | null;
  entityId?: string | null;
  targetUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
  dedupeKey?: string | null;
}
