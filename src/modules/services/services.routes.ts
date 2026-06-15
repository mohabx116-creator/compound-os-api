import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { requireAdminRole, requireAuth } from '../auth/auth.middleware.js';
import { ServicesController } from './services.controller.js';
import {
  adminServiceItemQuerySchema,
  createServiceCategorySchema,
  createServiceItemSchema,
  serviceCategoryParamsSchema,
  serviceCategoryQuerySchema,
  serviceCategorySlugParamsSchema,
  serviceItemParamsSchema,
  serviceItemSlugParamsSchema,
  servicePublicQuerySchema,
  serviceRequestCreateSchema,
  serviceRequestParamsSchema,
  serviceRequestQuerySchema,
  updateServiceCategorySchema,
  updateServiceItemSchema,
  updateServiceRequestStatusSchema,
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
  '/categories',
  validate({ query: servicePublicQuerySchema }),
  ServicesController.listPublicCategories,
);

router.get(
  '/categories/:slug',
  validate({ params: serviceCategorySlugParamsSchema, query: servicePublicQuerySchema }),
  ServicesController.getPublicCategoryBySlug,
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

router.post(
  '/items/:id/requests',
  validate({ params: serviceItemParamsSchema, body: serviceRequestCreateSchema }),
  ServicesController.createServiceRequest,
);

router.get(
  '/admin/categories',
  ...requireServicesAdmin,
  validate({ query: serviceCategoryQuerySchema }),
  ServicesController.listAdminCategories,
);

router.post(
  '/admin/categories',
  ...requireServicesAdmin,
  validate({ body: createServiceCategorySchema }),
  ServicesController.createAdminCategory,
);

router.get(
  '/admin/categories/:id',
  ...requireServicesAdmin,
  validate({ params: serviceCategoryParamsSchema }),
  ServicesController.getAdminCategoryById,
);

router.patch(
  '/admin/categories/:id',
  ...requireServicesAdmin,
  validate({ params: serviceCategoryParamsSchema, body: updateServiceCategorySchema }),
  ServicesController.updateAdminCategory,
);

router.delete(
  '/admin/categories/:id',
  ...requireServicesAdmin,
  validate({ params: serviceCategoryParamsSchema }),
  ServicesController.deleteAdminCategory,
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

router.get(
  '/admin/requests',
  ...requireServicesAdmin,
  validate({ query: serviceRequestQuerySchema }),
  ServicesController.listAdminRequests,
);

router.get(
  '/admin/requests/:id',
  ...requireServicesAdmin,
  validate({ params: serviceRequestParamsSchema }),
  ServicesController.getAdminRequestById,
);

router.patch(
  '/admin/requests/:id/status',
  ...requireServicesAdmin,
  validate({ params: serviceRequestParamsSchema, body: updateServiceRequestStatusSchema }),
  ServicesController.updateAdminRequestStatus,
);

export const servicesRoutes = router;
