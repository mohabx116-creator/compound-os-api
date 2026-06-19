import { Router } from 'express';
import * as adminRealEstateController from './admin-real-estate.controller.js';

const router = Router();

// Listings
router.get('/listings', adminRealEstateController.getAdminListings);
router.post('/listings', adminRealEstateController.createAdminListing);
router.get('/listings/:id', adminRealEstateController.getAdminListingById);
router.patch('/listings/:id', adminRealEstateController.updateAdminListing);
router.patch('/listings/:id/status', adminRealEstateController.updateAdminListingStatus);
router.delete('/listings/:id', adminRealEstateController.softDeleteAdminListing);

// Submissions
router.get('/submissions', adminRealEstateController.getAdminSubmissions);
router.patch('/submissions/:id/status', adminRealEstateController.updateSubmissionStatus);
router.post('/submissions/:id/convert', adminRealEstateController.convertSubmission);

// Inquiries
router.get('/inquiries', adminRealEstateController.getAdminInquiries);
router.patch('/inquiries/:id/status', adminRealEstateController.updateInquiryStatus);

export const adminRealEstateRoutes = router;
