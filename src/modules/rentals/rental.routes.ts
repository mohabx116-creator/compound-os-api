import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { RentalController } from './rental.controller.js';
import {
  adminCreateListingSchema,
  adminRentalListQuerySchema,
  adminUpdateListingSchema,
  contactAccessQuerySchema,
  createRentalInquirySchema,
  createRentalOwnerSchema,
  rentalInquiryParamsSchema,
  rentalInquiryQuerySchema,
  rentalOwnerParamsSchema,
  rentalOwnerQuerySchema,
  rentalIdParamsSchema,
  rentalListQuerySchema,
  rentalSlugParamsSchema,
  tenantPaymentRequestSchema,
  updateRentalInquiryStatusSchema,
  updateRentalOwnerSchema,
} from './rental.schema.js';

const router = Router();

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
  validate({ params: rentalIdParamsSchema, body: createRentalInquirySchema }),
  RentalController.createRentalInquiry,
);

router.post(
  '/listings/:id/contact-unlock',
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
  validate({ params: rentalIdParamsSchema, body: tenantPaymentRequestSchema }),
  RentalController.startReservationPayment,
);

router.get(
  '/reservations/:id',
  validate({ params: rentalIdParamsSchema }),
  RentalController.getReservationById,
);

router.post('/payments/paymob/webhook', RentalController.handlePaymobWebhook);

// TODO Phase A3: protect admin rental routes with ADMIN/MANAGER role middleware.
router.get(
  '/admin/owners',
  validate({ query: rentalOwnerQuerySchema }),
  RentalController.listRentalOwners,
);

router.get(
  '/admin/owners/:id',
  validate({ params: rentalOwnerParamsSchema }),
  RentalController.getRentalOwnerById,
);

router.post(
  '/admin/owners',
  validate({ body: createRentalOwnerSchema }),
  RentalController.createRentalOwner,
);

router.patch(
  '/admin/owners/:id',
  validate({ params: rentalOwnerParamsSchema, body: updateRentalOwnerSchema }),
  RentalController.updateRentalOwner,
);

router.patch(
  '/admin/owners/:id/activate',
  validate({ params: rentalOwnerParamsSchema }),
  RentalController.activateRentalOwner,
);

router.patch(
  '/admin/owners/:id/deactivate',
  validate({ params: rentalOwnerParamsSchema }),
  RentalController.deactivateRentalOwner,
);

router.get(
  '/admin/inquiries',
  validate({ query: rentalInquiryQuerySchema }),
  RentalController.listAdminInquiries,
);

router.get(
  '/admin/inquiries/:id',
  validate({ params: rentalInquiryParamsSchema }),
  RentalController.getAdminInquiryById,
);

router.patch(
  '/admin/inquiries/:id/status',
  validate({ params: rentalInquiryParamsSchema, body: updateRentalInquiryStatusSchema }),
  RentalController.updateAdminInquiryStatus,
);

router.get(
  '/admin/listings',
  validate({ query: adminRentalListQuerySchema }),
  RentalController.listAdminListings,
);

router.get(
  '/admin/listings/:id',
  validate({ params: rentalIdParamsSchema }),
  RentalController.getAdminListingById,
);

router.post(
  '/admin/listings',
  validate({ body: adminCreateListingSchema }),
  RentalController.createAdminListing,
);

router.patch(
  '/admin/listings/:id',
  validate({ params: rentalIdParamsSchema, body: adminUpdateListingSchema }),
  RentalController.updateAdminListing,
);

router.patch(
  '/admin/listings/:id/publish',
  validate({ params: rentalIdParamsSchema }),
  RentalController.publishAdminListing,
);

router.patch(
  '/admin/listings/:id/unpublish',
  validate({ params: rentalIdParamsSchema }),
  RentalController.unpublishAdminListing,
);

router.patch(
  '/admin/reservations/:id/confirm',
  validate({ params: rentalIdParamsSchema }),
  RentalController.confirmReservation,
);

router.patch(
  '/admin/reservations/:id/cancel',
  validate({ params: rentalIdParamsSchema }),
  RentalController.cancelReservation,
);

router.post(
  '/admin/maintenance/expire-reservations',
  RentalController.expireStaleReservations,
);

export const rentalRoutes = router;
