import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { AdminNotificationController } from './admin-notification.controller.js';
import {
  adminNotificationParamsSchema,
  adminNotificationQuerySchema,
} from './admin-notification.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: adminNotificationQuerySchema }),
  AdminNotificationController.listAdminNotifications,
);

router.get(
  '/unread-count',
  AdminNotificationController.getUnreadCount,
);

router.patch(
  '/read-all',
  AdminNotificationController.markAllNotificationsRead,
);

router.patch(
  '/:id/read',
  validate({ params: adminNotificationParamsSchema }),
  AdminNotificationController.markNotificationRead,
);

export const adminNotificationRoutes = router;
