import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { successResponse } from '../../common/utils/api-response.js';
import { ResidentService } from './resident.service.js';
import type {
  CreateResidentInput,
  ResidentParams,
  ResidentQuery,
  UpdateResidentInput,
} from './resident.types.js';

export class ResidentController {
  static listResidents = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ResidentQuery;
    const result = await ResidentService.listResidents(query);

    successResponse({
      res,
      message: 'Residents retrieved successfully',
      data: result.residents,
      meta: result.meta,
    });
  });

  static getResidentById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ResidentParams;
    const resident = await ResidentService.getResidentById(id);

    successResponse({
      res,
      message: 'Resident retrieved successfully',
      data: resident,
    });
  });

  static createResident = asyncHandler(async (req: Request, res: Response) => {
    const resident = await ResidentService.createResident(req.body as CreateResidentInput);

    successResponse({
      res,
      statusCode: 201,
      message: 'Resident created successfully',
      data: resident,
    });
  });

  static updateResident = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ResidentParams;
    const resident = await ResidentService.updateResident(
      id,
      req.body as UpdateResidentInput,
    );

    successResponse({
      res,
      message: 'Resident updated successfully',
      data: resident,
    });
  });

  static deleteResident = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ResidentParams;
    const resident = await ResidentService.deleteResident(id);

    successResponse({
      res,
      message: 'Resident deleted successfully',
      data: resident,
    });
  });
}
