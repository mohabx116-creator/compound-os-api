import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { ResidentController } from './resident.controller.js';
import {
  createResidentSchema,
  residentParamsSchema,
  residentQuerySchema,
  updateResidentSchema,
} from './resident.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: residentQuerySchema }),
  ResidentController.listResidents,
);

router.get(
  '/:id',
  validate({ params: residentParamsSchema }),
  ResidentController.getResidentById,
);

router.post(
  '/',
  validate({ body: createResidentSchema }),
  ResidentController.createResident,
);

router.patch(
  '/:id',
  validate({ params: residentParamsSchema, body: updateResidentSchema }),
  ResidentController.updateResident,
);

router.delete(
  '/:id',
  validate({ params: residentParamsSchema }),
  ResidentController.deleteResident,
);

export const residentRoutes = router;
