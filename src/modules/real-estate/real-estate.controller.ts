import { Request, Response } from 'express';
import { realEstateService } from './real-estate.service.js';
import { 
  PublicListingsQuerySchema, 
  CreateOwnerSubmissionSchema, 
  CreateRealEstateInquirySchema,
  cloudinaryUploadSignatureSchema,
} from './real-estate.schema.js';
import { mapPublicListingsDto, mapPublicListingDto } from './real-estate.mapper.js';

export const getListings = async (req: Request, res: Response) => {
  try {
    const filters = PublicListingsQuerySchema.parse(req.query);
    const listings = await realEstateService.getPublicListings(filters);
    
    // Privacy: Strip internal data
    const safeListings = mapPublicListingsDto(listings);
    
    res.json({ success: true, message: 'Real estate listings retrieved successfully', data: safeListings });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getListingBySlug = async (req: Request, res: Response) => {
  try {
    const listing = await realEstateService.getPublicListingBySlug(req.params.slug);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    
    // Privacy: Strip internal data
    const safeListing = mapPublicListingDto(listing);
    
    res.json({ success: true, message: 'Real estate listing retrieved successfully', data: safeListing });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOwnerSubmission = async (req: Request, res: Response) => {
  try {
    const data = CreateOwnerSubmissionSchema.parse(req.body);
    const submission = await realEstateService.createOwnerSubmission(data);
    res.status(201).json({ success: true, message: 'Real estate owner submission created successfully', data: { id: submission.id, status: submission.status } });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createOwnerSubmissionUploadSignature = async (req: Request, res: Response) => {
  try {
    const input = cloudinaryUploadSignatureSchema.parse(req.body ?? {});
    const result = realEstateService.createCloudinaryUploadSignature(input);

    res.json({
      success: true,
      message: 'Real estate upload signature created successfully',
      data: result,
    });
  } catch (error: any) {
    const statusCode = error?.statusCode ?? 400;
    res.status(statusCode).json({ success: false, message: error.message });
  }
};

export const createInquiry = async (req: Request, res: Response) => {
  try {
    const data = CreateRealEstateInquirySchema.parse(req.body);
    const result = await realEstateService.createInquiry(data);
    res.status(201).json({
      success: true,
      message: 'Real estate inquiry created successfully',
      data: {
        id: result.inquiry.id,
        status: result.inquiry.status,
        whatsappUrl: result.whatsappUrl,
      },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
