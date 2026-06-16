import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { successResponse } from '../../common/utils/api-response.js';
import { AdminSettingsService } from './admin-settings.service.js';
import type {
  UpdateProfileInput,
  ChangePasswordInput,
  UpdateCompoundSettingsInput,
} from './admin-settings.types.js';

export class AdminSettingsController {
  static getSettings = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.auth!.sub;
    const compoundId = req.auth!.compoundId;

    const data = await AdminSettingsService.getSettings(adminId, compoundId);

    successResponse({
      res,
      message: 'Admin settings retrieved successfully',
      data,
    });
  });

  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.auth!.sub;

    const data = await AdminSettingsService.updateProfile(
      adminId,
      req.body as UpdateProfileInput,
    );

    successResponse({
      res,
      message: 'Admin profile updated successfully',
      data,
    });
  });

  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    const adminId = req.auth!.sub;

    await AdminSettingsService.changePassword(
      adminId,
      req.body as ChangePasswordInput,
    );

    successResponse({
      res,
      message: 'تم تغيير كلمة المرور بنجاح',
      data: null,
    });
  });

  static updateCompound = asyncHandler(async (req: Request, res: Response) => {
    const compoundId = req.auth!.compoundId;

    const data = await AdminSettingsService.updateCompound(
      compoundId,
      req.body as UpdateCompoundSettingsInput,
    );

    successResponse({
      res,
      message: 'Compound settings updated successfully',
      data,
    });
  });
}
