import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { ServiceProviderController } from './service-provider.controller.js';
import {
  serviceProviderParamsSchema,
  serviceProviderQuerySchema,
} from './service-provider.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: serviceProviderQuerySchema }),
  ServiceProviderController.listServiceProviders,
);

router.get(
  '/:id',
  validate({ params: serviceProviderParamsSchema }),
  ServiceProviderController.getServiceProviderById,
);

export const serviceProviderRoutes = router;
