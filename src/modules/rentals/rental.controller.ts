import { Request, Response } from 'express';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { RentalPaymentService } from './rental-payment.service.js';
import { RentalService } from './rental.service.js';
import type {
  AdminCreateListingInput,
  AdminRentalListQuery,
  AdminUpdateListingInput,
  CloudinaryUploadSignatureInput,
  ContactAccessQuery,
  CreateRentalOwnerInput,
  CreateRentalInquiryInput,
  CreateOwnerSubmissionInput,
  RentalBedParams,
  RentalIdParams,
  RentalInquiryParams,
  RentalInquiryQuery,
  RentalListingBedsParams,
  RentalListQuery,
  OwnerSubmissionParams,
  OwnerSubmissionQuery,
  RentalOwnerParams,
  RentalOwnerQuery,
  RentalSlugParams,
  TenantPaymentRequestInput,
  UpdateOwnerSubmissionStatusInput,
  UpdateRentalBedStatusInput,
  UpdateRentalInquiryStatusInput,
  UpdateRentalOwnerInput,
} from './rental.types.js';

export class RentalController {
  static createCloudinaryUploadSignature = asyncHandler(async (req: Request, res: Response) => {
    const result = RentalService.createCloudinaryUploadSignature(
      req.body as CloudinaryUploadSignatureInput,
    );

    successResponse({
      res,
      message: 'Cloudinary upload signature created successfully',
      data: result,
    });
  });

  static createAdminListingCloudinaryUploadSignature = asyncHandler(async (_req: Request, res: Response) => {
    const result = RentalService.createAdminListingCloudinaryUploadSignature();

    successResponse({
      res,
      message: 'Cloudinary listing upload signature created successfully',
      data: result,
    });
  });

  static createOwnerSubmission = asyncHandler(async (req: Request, res: Response) => {
    const submission = await RentalService.createOwnerSubmission(
      req.body as CreateOwnerSubmissionInput,
    );

    successResponse({
      res,
      statusCode: 201,
      message: 'Owner listing submission created successfully',
      data: submission,
    });
  });

  static getOwnerSubmissionStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as OwnerSubmissionParams;
    const submission = await RentalService.getOwnerSubmissionStatus(id);

    successResponse({
      res,
      message: 'Owner listing submission status retrieved successfully',
      data: submission,
    });
  });

  static listAdminOwnerSubmissions = asyncHandler(async (req: Request, res: Response) => {
    const result = await RentalService.listAdminOwnerSubmissions(
      req.query as unknown as OwnerSubmissionQuery,
    );

    successResponse({
      res,
      message: 'Owner listing submissions retrieved successfully',
      data: result.submissions,
      meta: result.meta,
    });
  });

  static getAdminOwnerSubmissionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as OwnerSubmissionParams;
    const submission = await RentalService.getAdminOwnerSubmissionById(id);

    successResponse({
      res,
      message: 'Owner listing submission retrieved successfully',
      data: submission,
    });
  });

  static updateAdminOwnerSubmissionStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as OwnerSubmissionParams;
    const submission = await RentalService.updateAdminOwnerSubmissionStatus(
      id,
      req.body as UpdateOwnerSubmissionStatusInput,
    );

    successResponse({
      res,
      message: 'Owner listing submission status updated successfully',
      data: submission,
    });
  });

  static convertAdminOwnerSubmissionToListing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as OwnerSubmissionParams;
    const result = await RentalService.convertOwnerSubmissionToListing(id);

    successResponse({
      res,
      statusCode: 201,
      message: 'Owner listing submission converted to draft listing successfully',
      data: result,
    });
  });

  static approveAndConvertAdminOwnerSubmissionToListing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as OwnerSubmissionParams;
    const result = await RentalService.approveAndConvertOwnerSubmissionToListing(id);

    successResponse({
      res,
      statusCode: 200,
      message: 'Owner listing submission approved and converted successfully',
      data: result,
    });
  });

  static listRentalOwners = asyncHandler(async (req: Request, res: Response) => {
    const result = await RentalService.listRentalOwners(
      req.query as unknown as RentalOwnerQuery,
    );

    successResponse({
      res,
      message: 'Rental owners retrieved successfully',
      data: result.owners,
      meta: result.meta,
    });
  });

  static getRentalOwnerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalOwnerParams;
    const owner = await RentalService.getRentalOwnerById(id);

    successResponse({
      res,
      message: 'Rental owner retrieved successfully',
      data: owner,
    });
  });

  static createRentalOwner = asyncHandler(async (req: Request, res: Response) => {
    const owner = await RentalService.createRentalOwner(req.body as CreateRentalOwnerInput);

    successResponse({
      res,
      statusCode: 201,
      message: 'Rental owner created successfully',
      data: owner,
    });
  });

  static updateRentalOwner = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalOwnerParams;
    const owner = await RentalService.updateRentalOwner(
      id,
      req.body as UpdateRentalOwnerInput,
    );

    successResponse({
      res,
      message: 'Rental owner updated successfully',
      data: owner,
    });
  });

  static activateRentalOwner = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalOwnerParams;
    const owner = await RentalService.activateRentalOwner(id);

    successResponse({
      res,
      message: 'Rental owner activated successfully',
      data: owner,
    });
  });

  static deactivateRentalOwner = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalOwnerParams;
    const owner = await RentalService.deactivateRentalOwner(id);

    successResponse({
      res,
      message: 'Rental owner deactivated successfully',
      data: owner,
    });
  });

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

  static createRentalInquiry = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const inquiry = await RentalService.createRentalInquiry(
      id,
      req.body as CreateRentalInquiryInput,
    );

    successResponse({
      res,
      statusCode: 201,
      message: 'Rental inquiry submitted successfully',
      data: inquiry,
    });
  });

  static startContactUnlockPayment = asyncHandler(async (req: Request, res: Response) => {
    void res;
    const { id } = req.params as unknown as RentalIdParams;
    await RentalService.startContactUnlockPayment(
      id,
      req.body as TenantPaymentRequestInput,
    );
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
      message: 'Rental bed reservation created successfully',
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

  static listAdminListingBeds = asyncHandler(async (req: Request, res: Response) => {
    const { listingId } = req.params as unknown as RentalListingBedsParams;
    const beds = await RentalService.listAdminListingBeds(listingId);

    successResponse({
      res,
      message: 'Rental listing beds retrieved successfully',
      data: beds,
    });
  });

  static updateAdminBedStatus = asyncHandler(async (req: Request, res: Response) => {
    const { bedId } = req.params as unknown as RentalBedParams;
    const result = await RentalService.updateAdminBedStatus(
      bedId,
      req.body as UpdateRentalBedStatusInput,
    );

    successResponse({
      res,
      message: 'Rental bed status updated successfully',
      data: result,
    });
  });

  static syncAdminListingBedCounters = asyncHandler(async (req: Request, res: Response) => {
    const { listingId } = req.params as unknown as RentalListingBedsParams;
    const listing = await RentalService.syncListingCountersFromBeds(listingId);

    successResponse({
      res,
      message: 'Rental listing bed counters synchronized successfully',
      data: listing,
    });
  });

  static listAdminInquiries = asyncHandler(async (req: Request, res: Response) => {
    const result = await RentalService.listAdminInquiries(
      req.query as unknown as RentalInquiryQuery,
    );

    successResponse({
      res,
      message: 'Rental inquiries retrieved successfully',
      data: result.inquiries,
      meta: result.meta,
    });
  });

  static getAdminInquiryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalInquiryParams;
    const inquiry = await RentalService.getAdminInquiryById(id);

    successResponse({
      res,
      message: 'Rental inquiry retrieved successfully',
      data: inquiry,
    });
  });

  static updateAdminInquiryStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalInquiryParams;
    const inquiry = await RentalService.updateAdminInquiryStatus(
      id,
      req.body as UpdateRentalInquiryStatusInput,
    );

    successResponse({
      res,
      message: 'Rental inquiry status updated successfully',
      data: inquiry,
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

  static deleteAdminListing = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const listing = await RentalService.deleteAdminListing(id);

    successResponse({
      res,
      message: 'Rental listing deleted successfully',
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

  static markAdminListingAvailable = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const listing = await RentalService.markAdminListingAvailable(id);

    successResponse({
      res,
      message: 'Rental listing marked available successfully',
      data: listing,
    });
  });

  static markAdminListingRented = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as RentalIdParams;
    const listing = await RentalService.markAdminListingRented(id);

    successResponse({
      res,
      message: 'Rental listing marked rented successfully',
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
