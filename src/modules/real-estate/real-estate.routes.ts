import { Router } from 'express';
import * as realEstateController from './real-estate.controller.js';

const router = Router();

router.get('/listings', realEstateController.getListings);
router.get('/listings/:slug', realEstateController.getListingBySlug);
router.post('/owner-submissions', realEstateController.createOwnerSubmission);
router.post('/inquiries', realEstateController.createInquiry);

export const realEstateRoutes = router;
