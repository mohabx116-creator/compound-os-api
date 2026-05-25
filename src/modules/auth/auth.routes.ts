import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { AuthController } from './auth.controller.js';
import { requireAuth } from './auth.middleware.js';
import { adminLoginSchema, residentLoginSchema } from './auth.schema.js';

const router = Router();

router.get('/status', AuthController.getStatus);
router.post(
  '/resident/login',
  validate({ body: residentLoginSchema }),
  AuthController.loginResident,
);
router.post(
  '/admin/login',
  validate({ body: adminLoginSchema }),
  AuthController.loginAdmin,
);
router.get('/me', requireAuth, AuthController.getMe);

export const authRoutes = router;
