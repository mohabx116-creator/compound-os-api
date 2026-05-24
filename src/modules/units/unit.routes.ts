import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { UnitController } from './unit.controller.js';
import {
  createUnitSchema,
  unitParamsSchema,
  unitQuerySchema,
  updateUnitSchema,
} from './unit.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: unitQuerySchema }),
  UnitController.listUnits,
);

router.get(
  '/:id',
  validate({ params: unitParamsSchema }),
  UnitController.getUnitById,
);

router.post(
  '/',
  validate({ body: createUnitSchema }),
  UnitController.createUnit,
);

router.patch(
  '/:id',
  validate({ params: unitParamsSchema, body: updateUnitSchema }),
  UnitController.updateUnit,
);

router.delete(
  '/:id',
  validate({ params: unitParamsSchema }),
  UnitController.deleteUnit,
);

export const unitRoutes = router;
