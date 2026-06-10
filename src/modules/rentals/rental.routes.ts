import { Router } from 'express';
import { rateLimit } from '../../common/middlewares/rate-limit.middleware.js';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { requireAdminRole, requireAuth } from '../auth/auth.middleware.js';
import { RentalController } from './rental.controller.js';
import {
  adminCreateListingSchema,
  adminRentalListQuerySchema,
  adminUpdateListingSchema,
  cloudinaryUploadSignatureSchema,
  contactAccessQuerySchema,
  createOwnerSubmissionSchema,
  createRentalInquirySchema,
  createRentalOwnerSchema,
  ownerSubmissionParamsSchema,
  ownerSubmissionQuerySchema,
  rentalInquiryParamsSchema,
  rentalInquiryQuerySchema,
  rentalOwnerParamsSchema,
  rentalOwnerQuerySchema,
  rentalIdParamsSchema,
  rentalListQuerySchema,
  rentalSlugParamsSchema,
  tenantPaymentRequestSchema,
  updateOwnerSubmissionStatusSchema,
  updateRentalInquiryStatusSchema,
  updateRentalOwnerSchema,
} from './rental.schema.js';

const router = Router();
const requireRentalAdmin = [requireAuth, requireAdminRole] as const;

const publicPaymentInitiationLimiter = rateLimit({
  keyPrefix: 'rentals:payment-initiation',
  max: 10,
  windowMs: 15 * 60 * 1000,
});

const publicRentalActionLimiter = rateLimit({
  keyPrefix: 'rentals:public-action',
  max: 20,
  windowMs: 15 * 60 * 1000,
});

const uploadSignatureRateLimiter = rateLimit({
  keyPrefix: 'rentals:upload-signature',
  max: 300,
  windowMs: 15 * 60 * 1000,
});

router.post(
  '/owner-submissions/upload-signature',
  uploadSignatureRateLimiter,
  validate({ body: cloudinaryUploadSignatureSchema }),
  RentalController.createCloudinaryUploadSignature,
);

router.post(
  '/owner-submissions',
  publicRentalActionLimiter,
  validate({ body: createOwnerSubmissionSchema }),
  RentalController.createOwnerSubmission,
);

router.get(
  '/owner-submissions/:id/status',
  publicRentalActionLimiter,
  validate({ params: ownerSubmissionParamsSchema }),
  RentalController.getOwnerSubmissionStatus,
);

router.get(
  '/listings',
  validate({ query: rentalListQuerySchema }),
  RentalController.listPublicListings,
);

router.get(
  '/listings/:slug',
  validate({ params: rentalSlugParamsSchema }),
  RentalController.getPublicListingBySlug,
);

router.post(
  '/listings/:id/inquiries',
  publicRentalActionLimiter,
  validate({ params: rentalIdParamsSchema, body: createRentalInquirySchema }),
  RentalController.createRentalInquiry,
);

router.post(
  '/listings/:id/contact-unlock',
  publicPaymentInitiationLimiter,
  validate({ params: rentalIdParamsSchema, body: tenantPaymentRequestSchema }),
  RentalController.startContactUnlockPayment,
);

router.get(
  '/listings/:id/contact-access',
  validate({ params: rentalIdParamsSchema, query: contactAccessQuerySchema }),
  RentalController.getContactAccess,
);

router.post(
  '/listings/:id/reservations',
  publicPaymentInitiationLimiter,
  validate({ params: rentalIdParamsSchema, body: tenantPaymentRequestSchema }),
  RentalController.startReservationPayment,
);

router.get(
  '/reservations/:id',
  validate({ params: rentalIdParamsSchema }),
  RentalController.getReservationById,
);

router.post('/payments/paymob/webhook', RentalController.handlePaymobWebhook);

router.get(
  '/admin/owners',
  ...requireRentalAdmin,
  validate({ query: rentalOwnerQuerySchema }),
  RentalController.listRentalOwners,
);

router.get(
  '/admin/owners/:id',
  ...requireRentalAdmin,
  validate({ params: rentalOwnerParamsSchema }),
  RentalController.getRentalOwnerById,
);

router.post(
  '/admin/owners',
  ...requireRentalAdmin,
  validate({ body: createRentalOwnerSchema }),
  RentalController.createRentalOwner,
);

router.patch(
  '/admin/owners/:id',
  ...requireRentalAdmin,
  validate({ params: rentalOwnerParamsSchema, body: updateRentalOwnerSchema }),
  RentalController.updateRentalOwner,
);

router.patch(
  '/admin/owners/:id/activate',
  ...requireRentalAdmin,
  validate({ params: rentalOwnerParamsSchema }),
  RentalController.activateRentalOwner,
);

router.patch(
  '/admin/owners/:id/deactivate',
  ...requireRentalAdmin,
  validate({ params: rentalOwnerParamsSchema }),
  RentalController.deactivateRentalOwner,
);

router.get(
  '/admin/inquiries',
  ...requireRentalAdmin,
  validate({ query: rentalInquiryQuerySchema }),
  RentalController.listAdminInquiries,
);

router.get(
  '/admin/inquiries/:id',
  ...requireRentalAdmin,
  validate({ params: rentalInquiryParamsSchema }),
  RentalController.getAdminInquiryById,
);

router.get(
  '/admin/owner-submissions',
  ...requireRentalAdmin,
  validate({ query: ownerSubmissionQuerySchema }),
  RentalController.listAdminOwnerSubmissions,
);

router.get(
  '/admin/owner-submissions/:id',
  ...requireRentalAdmin,
  validate({ params: ownerSubmissionParamsSchema }),
  RentalController.getAdminOwnerSubmissionById,
);

router.patch(
  '/admin/owner-submissions/:id/status',
  ...requireRentalAdmin,
  validate({ params: ownerSubmissionParamsSchema, body: updateOwnerSubmissionStatusSchema }),
  RentalController.updateAdminOwnerSubmissionStatus,
);

router.post(
  '/admin/owner-submissions/:id/convert-to-listing',
  ...requireRentalAdmin,
  validate({ params: ownerSubmissionParamsSchema }),
  RentalController.convertAdminOwnerSubmissionToListing,
);

router.post(
  '/admin/owner-submissions/:id/approve-and-convert',
  ...requireRentalAdmin,
  validate({ params: ownerSubmissionParamsSchema }),
  RentalController.approveAndConvertAdminOwnerSubmissionToListing,
);


router.patch(
  '/admin/inquiries/:id/status',
  ...requireRentalAdmin,
  validate({ params: rentalInquiryParamsSchema, body: updateRentalInquiryStatusSchema }),
  RentalController.updateAdminInquiryStatus,
);

router.get(
  '/admin/listings',
  ...requireRentalAdmin,
  validate({ query: adminRentalListQuerySchema }),
  RentalController.listAdminListings,
);

router.post(
  '/admin/listings/upload-signature',
  ...requireRentalAdmin,
  uploadSignatureRateLimiter,
  RentalController.createAdminListingCloudinaryUploadSignature,
);

router.get(
  '/admin/listings/:id',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema }),
  RentalController.getAdminListingById,
);

router.post(
  '/admin/listings',
  ...requireRentalAdmin,
  validate({ body: adminCreateListingSchema }),
  RentalController.createAdminListing,
);

router.patch(
  '/admin/listings/:id',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema, body: adminUpdateListingSchema }),
  RentalController.updateAdminListing,
);

router.patch(
  '/admin/listings/:id/publish',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema }),
  RentalController.publishAdminListing,
);

router.patch(
  '/admin/listings/:id/unpublish',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema }),
  RentalController.unpublishAdminListing,
);

router.patch(
  '/admin/listings/:id/mark-available',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema }),
  RentalController.markAdminListingAvailable,
);

router.patch(
  '/admin/listings/:id/mark-rented',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema }),
  RentalController.markAdminListingRented,
);

router.delete(
  '/admin/listings/:id',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema }),
  RentalController.deleteAdminListing,
);

router.patch(
  '/admin/reservations/:id/confirm',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema }),
  RentalController.confirmReservation,
);

router.patch(
  '/admin/reservations/:id/cancel',
  ...requireRentalAdmin,
  validate({ params: rentalIdParamsSchema }),
  RentalController.cancelReservation,
);

router.post(
  '/admin/maintenance/expire-reservations',
  ...requireRentalAdmin,
  RentalController.expireStaleReservations,
);

export const rentalRoutes = router;
