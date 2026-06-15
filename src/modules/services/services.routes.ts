import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { requireAdminRole, requireAuth } from '../auth/auth.middleware.js';
import { ServicesController } from './services.controller.js';
import {
  adminServiceItemQuerySchema,
  createServiceItemSchema,
  serviceItemParamsSchema,
  serviceItemSlugParamsSchema,
  servicePublicQuerySchema,
  updateServiceItemSchema,
  publicServiceItemQuerySchema,
} from './services.schema.js';

const router = Router();
const requireServicesAdmin = [requireAuth, requireAdminRole] as const;

router.get(
  '/',
  validate({ query: servicePublicQuerySchema }),
  ServicesController.getServicesHome,
);

router.get(
  '/items',
  validate({ query: publicServiceItemQuerySchema }),
  ServicesController.listPublicItems,
);

router.get(
  '/items/:slug',
  validate({ params: serviceItemSlugParamsSchema, query: servicePublicQuerySchema }),
  ServicesController.getPublicItemBySlug,
);

router.get(
  '/admin/items',
  ...requireServicesAdmin,
  validate({ query: adminServiceItemQuerySchema }),
  ServicesController.listAdminItems,
);

router.post(
  '/admin/items',
  ...requireServicesAdmin,
  validate({ body: createServiceItemSchema }),
  ServicesController.createAdminItem,
);

router.get(
  '/admin/items/:id',
  ...requireServicesAdmin,
  validate({ params: serviceItemParamsSchema }),
  ServicesController.getAdminItemById,
);

router.patch(
  '/admin/items/:id',
  ...requireServicesAdmin,
  validate({ params: serviceItemParamsSchema, body: updateServiceItemSchema }),
  ServicesController.updateAdminItem,
);

router.delete(
  '/admin/items/:id',
  ...requireServicesAdmin,
  validate({ params: serviceItemParamsSchema }),
  ServicesController.deleteAdminItem,
);

export const servicesRoutes = router;
