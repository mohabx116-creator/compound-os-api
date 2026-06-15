import { z } from 'zod';

const optionalBooleanFlag = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === true || value === false) return value;
  return undefined;
}, z.boolean().optional());

const adminNotificationEventTypeSchema = z.enum([
  'RENTAL_INQUIRY_CREATED',
  'RENTAL_OWNER_SUBMISSION_CREATED',
  'RENTAL_INQUIRY_APPROVED',
  'RENTAL_INQUIRY_CANCELLED',
  'RENTAL_OWNER_SUBMISSION_APPROVED',
  'RENTAL_OWNER_SUBMISSION_REJECTED',
  'SERVICE_REQUEST_CREATED',
  'SYSTEM',
]);

const adminNotificationEntityTypeSchema = z.enum([
  'RENTAL_INQUIRY',
  'RENTAL_OWNER_SUBMISSION',
  'RENTAL_LISTING',
  'RENTAL_TENANT',
  'SERVICE_REQUEST',
  'SYSTEM',
]);

export const adminNotificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: optionalBooleanFlag,
  eventType: adminNotificationEventTypeSchema.optional(),
  entityType: adminNotificationEntityTypeSchema.optional(),
});

export const adminNotificationParamsSchema = z.object({
  id: z.string().trim().min(1, 'Invalid notification id').max(100, 'Invalid notification id'),
});
