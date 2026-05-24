import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { ComplaintController } from './complaint.controller.js';
import {
  complaintParamsSchema,
  complaintQuerySchema,
  createComplaintSchema,
  updateComplaintSchema,
} from './complaint.schema.js';

const router = Router();

router.get(
  '/',
  validate({ query: complaintQuerySchema }),
  ComplaintController.listComplaints,
);

router.get(
  '/:id',
  validate({ params: complaintParamsSchema }),
  ComplaintController.getComplaintById,
);

router.post(
  '/',
  validate({ body: createComplaintSchema }),
  ComplaintController.createComplaint,
);

router.patch(
  '/:id',
  validate({ params: complaintParamsSchema, body: updateComplaintSchema }),
  ComplaintController.updateComplaint,
);

router.delete(
  '/:id',
  validate({ params: complaintParamsSchema }),
  ComplaintController.closeComplaint,
);

export const complaintRoutes = router;
