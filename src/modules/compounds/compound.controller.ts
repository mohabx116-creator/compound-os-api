import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { successResponse } from '../../common/utils/api-response.js';
import { CompoundService } from './compound.service.js';
import type {
  CompoundParams,
  CompoundQuery,
  CreateCompoundInput,
  UpdateCompoundInput,
} from './compound.types.js';

export class CompoundController {
  static listCompounds = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as CompoundQuery;
    const result = await CompoundService.listCompounds(query);

    successResponse({
      res,
      message: 'Compounds retrieved successfully',
      data: result.compounds,
      meta: result.meta,
    });
  });

  static getCompoundById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as CompoundParams;
    const compound = await CompoundService.getCompoundById(id);

    successResponse({
      res,
      message: 'Compound retrieved successfully',
      data: compound,
    });
  });

  static createCompound = asyncHandler(async (req: Request, res: Response) => {
    const compound = await CompoundService.createCompound(req.body as CreateCompoundInput);

    successResponse({
      res,
      statusCode: 201,
      message: 'Compound created successfully',
      data: compound,
    });
  });

  static updateCompound = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as CompoundParams;
    const compound = await CompoundService.updateCompound(id, req.body as UpdateCompoundInput);

    successResponse({
      res,
      message: 'Compound updated successfully',
      data: compound,
    });
  });

  static deleteCompound = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as CompoundParams;
    const result = await CompoundService.deleteCompound(id);

    successResponse({
      res,
      message: result.alreadyInactive
        ? 'Compound is already inactive'
        : 'Compound deactivated successfully',
      data: result.compound,
    });
  });
}
