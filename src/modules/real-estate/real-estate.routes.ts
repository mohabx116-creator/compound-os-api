import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import * as realEstateController from './real-estate.controller.js';
import { cloudinaryUploadSignatureSchema } from './real-estate.schema.js';

const router = Router();

router.get('/listings', realEstateController.getListings);
router.get('/listings/:slug', realEstateController.getListingBySlug);
router.post(
  '/owner-submissions/upload-signature',
  validate({ body: cloudinaryUploadSignatureSchema }),
  realEstateController.createOwnerSubmissionUploadSignature,
);
router.post('/owner-submissions', realEstateController.createOwnerSubmission);
router.post('/inquiries', realEstateController.createInquiry);

export const realEstateRoutes = router;
