import { Router as ExpressRouter } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { AdminSettingsController } from './admin-settings.controller.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  updateCompoundSettingsSchema,
} from './admin-settings.schema.js';

const router = ExpressRouter();

router.get('/', AdminSettingsController.getSettings);

router.patch(
  '/profile',
  validate({ body: updateProfileSchema }),
  AdminSettingsController.updateProfile,
);

router.patch(
  '/password',
  validate({ body: changePasswordSchema }),
  AdminSettingsController.changePassword,
);

router.patch(
  '/compound',
  validate({ body: updateCompoundSettingsSchema }),
  AdminSettingsController.updateCompound,
);

export const adminSettingsRoutes = router;
