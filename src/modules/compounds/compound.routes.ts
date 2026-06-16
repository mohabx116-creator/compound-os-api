import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { requireAdminRole } from '../auth/auth.middleware.js';
import { CompoundController } from './compound.controller.js';
import {
  compoundParamsSchema,
  compoundQuerySchema,
  createCompoundSchema,
  updateCompoundSchema,
} from './compound.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: compoundQuerySchema }),
  CompoundController.listCompounds,
);

router.get(
  '/:id',
  validate({ params: compoundParamsSchema }),
  CompoundController.getCompoundById,
);

router.post(
  '/',
  requireAdminRole,
  validate({ body: createCompoundSchema }),
  CompoundController.createCompound,
);

router.patch(
  '/:id',
  requireAdminRole,
  validate({ params: compoundParamsSchema, body: updateCompoundSchema }),
  CompoundController.updateCompound,
);

router.delete(
  '/:id',
  requireAdminRole,
  validate({ params: compoundParamsSchema }),
  CompoundController.deleteCompound,
);

export const compoundRoutes = router;

