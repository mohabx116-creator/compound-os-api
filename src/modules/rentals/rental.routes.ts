import { Router } from 'express';
import { validate } from '../../common/middlewares/validate.middleware.js';
import { RentalController } from './rental.controller.js';
import {
  adminCreateListingSchema,
  adminRentalListQuerySchema,
  adminUpdateListingSchema,
  contactAccessQuerySchema,
  rentalIdParamsSchema,
  rentalListQuerySchema,
  rentalSlugParamsSchema,
  tenantPaymentRequestSchema,
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
