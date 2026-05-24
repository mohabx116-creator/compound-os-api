import { Request, Response } from 'express';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { ComplaintService } from './complaint.service.js';
import type {
  ComplaintParams,
  ComplaintQuery,
  CreateComplaintInput,
  UpdateComplaintInput,
} from './complaint.types.js';

export class ComplaintController {
  static listComplaints = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ComplaintQuery;
    const result = await ComplaintService.listComplaints(query);

    successResponse({
      res,
      message: 'Complaints retrieved successfully',
      data: result.complaints,
      meta: result.meta,
    });
  });

  static getComplaintById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ComplaintParams;
    const complaint = await ComplaintService.getComplaintById(id);

    successResponse({
      res,
      message: 'Complaint retrieved successfully',
      data: complaint,
    });
  });

  static createComplaint = asyncHandler(async (req: Request, res: Response) => {
    const complaint = await ComplaintService.createComplaint(
      req.body as CreateComplaintInput,
    );

    successResponse({
      res,
      statusCode: 201,
      message: 'Complaint created successfully',
      data: complaint,
    });
  });

  static updateComplaint = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ComplaintParams;
    const complaint = await ComplaintService.updateComplaint(
      id,
      req.body as UpdateComplaintInput,
    );

    successResponse({
      res,
      message: 'Complaint updated successfully',
      data: complaint,
    });
  });

  static closeComplaint = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ComplaintParams;
    const result = await ComplaintService.closeComplaint(id);

    successResponse({
      res,
      message: result.alreadyClosed
        ? 'Complaint is already closed'
        : 'Complaint closed successfully',
      data: result.complaint,
    });
  });
}
