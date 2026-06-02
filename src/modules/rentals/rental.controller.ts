import { Request, Response } from 'express';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { RentalPaymentService } from './rental-payment.service.js';
import { RentalService } from './rental.service.js';
import type {
  AdminCreateListingInput,
  AdminRentalListQuery,
  AdminUpdateListingInput,
  ContactAccessQuery,
  RentalIdParams,
  RentalListQuery,
  RentalSlugParams,
  TenantPaymentRequestInput,
} from './rental.types.js';

export class RentalController {
  static listPublicListings = asyncHandler(async (req: Request, res: Response) => {
    const result = await RentalService.listPublicListings(req.query as unknown as RentalListQuery);

    successResponse({
      res,
      message: 'Rental listings retrieved successfully',
      data: result.listings,
      meta: result.meta,
    });
  });

  static getPublicListingBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params as unknown as RentalSlugParams;
    const listing = await RentalService.getPublicListingBySlug(slug);

    successResponse({
      res,
      message: 'Rental listing retrieved successfully',
      data: listing,
    });
  });

  static startContactUnlockPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const result = await RentalService.startContactUnlockPayment(
      id,
      req.body as TenantPaymentRequestInput,
    );

    successResponse({
      res,
      statusCode: result.alreadyUnlocked ? 200 : 201,
      message: result.alreadyUnlocked
        ? 'Contact access is already unlocked'
        : 'Contact unlock payment created successfully',
      data: result,
    });
  });

  static getContactAccess = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const result = await RentalService.getContactAccess(
      id,
      req.query as unknown as ContactAccessQuery,
    );

    successResponse({
      res,
      message: result.unlocked ? 'Contact access granted' : 'Contact access is locked',
      data: result,
    });
  });

  static startReservationPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const result = await RentalService.startReservationPayment(
      id,
      req.body as TenantPaymentRequestInput,
    );

    successResponse({
      res,
      statusCode: 201,
      message: 'Reservation payment created successfully',
      data: result,
    });
  });

  static getReservationById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const reservation = await RentalService.getReservationById(id);

    successResponse({
      res,
      message: 'Reservation retrieved successfully',
      data: reservation,
    });
  });

  static listAdminListings = asyncHandler(async (req: Request, res: Response) => {
    const result = await RentalService.listAdminListings(
      req.query as unknown as AdminRentalListQuery,
    );

    successResponse({
      res,
      message: 'Admin rental listings retrieved successfully',
      data: result.listings,
      meta: result.meta,
    });
  });

  static getAdminListingById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const listing = await RentalService.getAdminListingById(id);

    successResponse({
      res,
      message: 'Admin rental listing retrieved successfully',
      data: listing,
    });
  });

  static createAdminListing = asyncHandler(async (req: Request, res: Response) => {
    const listing = await RentalService.createAdminListing(req.body as AdminCreateListingInput);

    successResponse({
      res,
      statusCode: 201,
      message: 'Rental listing created successfully',
      data: listing,
    });
  });

  static updateAdminListing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const listing = await RentalService.updateAdminListing(
      id,
      req.body as AdminUpdateListingInput,
    );

    successResponse({
      res,
      message: 'Rental listing updated successfully',
      data: listing,
    });
  });

  static publishAdminListing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const listing = await RentalService.publishAdminListing(id);

    successResponse({
      res,
      message: 'Rental listing published successfully',
      data: listing,
    });
  });

  static unpublishAdminListing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const listing = await RentalService.unpublishAdminListing(id);

    successResponse({
      res,
      message: 'Rental listing unpublished successfully',
      data: listing,
    });
  });

  static confirmReservation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const result = await RentalService.confirmReservation(id);

    successResponse({
      res,
      message: 'Reservation confirmed successfully',
      data: result,
    });
  });

  static cancelReservation = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const result = await RentalService.cancelReservation(id);

    successResponse({
      res,
      message: 'Reservation cancelled successfully',
      data: result,
    });
  });

  static handlePaymobWebhook = asyncHandler(async (req: Request, res: Response) => {
    const result = await RentalPaymentService.handlePaymobWebhook({
      body: req.body as Record<string, any>,
      query: req.query as Record<string, any>,
      rawBody: req.rawBody,
    });

    successResponse({
      res,
      message: result.idempotent
        ? 'Payment webhook already processed'
        : 'Payment webhook processed successfully',
      data: result,
    });
  });

  static expireStaleReservations = asyncHandler(async (_req: Request, res: Response) => {
    const result = await RentalPaymentService.expireStaleReservationLocks();

    successResponse({
      res,
      message: 'Stale reservation locks processed successfully',
      data: result,
    });
  });
}
