import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { ServiceCategoryController } from './service-category.controller.js';
import {
  serviceCategoryParamsSchema,
  serviceCategoryQuerySchema,
} from './service-category.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: serviceCategoryQuerySchema }),
  ServiceCategoryController.listServiceCategories,
);

router.get(
  '/:id',
  validate({ params: serviceCategoryParamsSchema }),
  ServiceCategoryController.getServiceCategoryById,
);

export const serviceCategoryRoutes = router;
