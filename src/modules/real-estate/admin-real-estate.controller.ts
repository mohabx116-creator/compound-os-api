import { Request, Response } from 'express';
import { realEstateService } from './real-estate.service.js';
import { 
  AdminListingsQuerySchema,
  AdminCreateRealEstateListingSchema,
  AdminUpdateRealEstateListingSchema,
  AdminUpdateListingStatusSchema,
  AdminUpdateSubmissionStatusSchema,
  AdminUpdateInquiryStatusSchema,
} from './real-estate.schema.js';

export const getAdminListings = async (req: Request, res: Response) => {
  try {
    const filters = AdminListingsQuerySchema.parse(req.query);
    const listings = await realEstateService.getAdminListings(filters);
    res.json({ success: true, message: 'Admin real estate listings retrieved successfully', data: listings });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createAdminListing = async (req: Request, res: Response) => {
  try {
    const data = AdminCreateRealEstateListingSchema.parse({
      ...req.body,
      compoundId: req.auth?.compoundId,
    });
    const listing = await realEstateService.createAdminListing(data);
    res.status(201).json({ success: true, message: 'Admin real estate listing created successfully', data: listing });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAdminListingById = async (req: Request, res: Response) => {
  try {
    const listing = await realEstateService.getAdminListingById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Admin real estate listing retrieved successfully', data: listing });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminListing = async (req: Request, res: Response) => {
  try {
    const data = AdminUpdateRealEstateListingSchema.parse(req.body);
    const listing = await realEstateService.updateAdminListing(req.params.id, data);
    res.json({ success: true, message: 'Admin real estate listing updated successfully', data: listing });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateAdminListingStatus = async (req: Request, res: Response) => {
  try {
    const { status } = AdminUpdateListingStatusSchema.parse(req.body);
    const listing = await realEstateService.updateListingStatus(req.params.id, status);
    res.json({ success: true, message: 'Admin real estate listing status updated successfully', data: listing });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const softDeleteAdminListing = async (req: Request, res: Response) => {
  try {
    const reverseRevenue = req.query.reverseRevenue === 'true' || req.query.reverseRevenue === '1';
    if (reverseRevenue && !req.auth?.isPlatformOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const listing = await realEstateService.softDeleteListing(req.params.id, {
      reverseRevenue,
    });
    res.json({ success: true, message: 'Admin real estate listing hidden successfully', data: listing });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminSubmissions = async (req: Request, res: Response) => {
  try {
    const submissions = await realEstateService.getAdminSubmissions();
    res.json({ success: true, message: 'Admin real estate submissions retrieved successfully', data: submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSubmissionStatus = async (req: Request, res: Response) => {
  try {
    const { status, adminNotes } = AdminUpdateSubmissionStatusSchema.parse(req.body);
    const submission = await realEstateService.updateSubmissionStatus(req.params.id, status, adminNotes);
    res.json({ success: true, message: 'Admin real estate submission status updated successfully', data: submission });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const convertSubmission = async (req: Request, res: Response) => {
  try {
    const listing = await realEstateService.convertSubmissionToListing(req.params.id);
    res.json({ success: true, message: 'Admin real estate submission converted successfully', data: listing });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAdminInquiries = async (req: Request, res: Response) => {
  try {
    const inquiries = await realEstateService.getAdminInquiries();
    res.json({ success: true, message: 'Admin real estate inquiries retrieved successfully', data: inquiries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInquiryStatus = async (req: Request, res: Response) => {
  try {
    const { status } = AdminUpdateInquiryStatusSchema.parse(req.body);
    const inquiry = await realEstateService.updateInquiryStatus(req.params.id, status);
    res.json({ success: true, message: 'Admin real estate inquiry status updated successfully', data: inquiry });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
