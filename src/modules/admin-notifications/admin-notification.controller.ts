import { Request, Response } from 'express';
import { AppError } from '../../common/errors/AppError.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { AdminNotificationService } from './admin-notification.service.js';
import type {
  AdminNotificationParams,
  AdminNotificationQuery,
} from './admin-notification.types.js';

export class AdminNotificationController {
  private static getCompoundId(req: Request): string {
    const compoundId = req.auth?.compoundId;

    if (!compoundId) {
      throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
    }

    return compoundId;
  }

  static listAdminNotifications = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as AdminNotificationQuery;
    const compoundId = this.getCompoundId(req);

    const result = await AdminNotificationService.listAdminNotifications(query, compoundId);

    successResponse({
      res,
      message: 'Admin notifications retrieved successfully',
      data: result.notifications,
      meta: result.meta,
    });
  });

  static getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const compoundId = this.getCompoundId(req);

    const result = await AdminNotificationService.getUnreadCount(compoundId);

    successResponse({
      res,
      message: 'Unread notification count retrieved successfully',
      data: result,
    });
  });

  static markNotificationRead = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as AdminNotificationParams;
    const compoundId = this.getCompoundId(req);

    const notification = await AdminNotificationService.markNotificationRead(id, compoundId);

    successResponse({
      res,
      message: 'Admin notification marked as read successfully',
      data: notification,
    });
  });

  static markAllNotificationsRead = asyncHandler(async (req: Request, res: Response) => {
    const compoundId = this.getCompoundId(req);

    const result = await AdminNotificationService.markAllNotificationsRead(compoundId);

    successResponse({
      res,
      message: 'All admin notifications marked as read successfully',
      data: result,
    });
  });
}
