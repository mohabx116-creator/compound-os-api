import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { successResponse } from '../../common/utils/api-response.js';
import { UnitService } from './unit.service.js';
import type {
  CreateUnitInput,
  UnitParams,
  UnitQuery,
  UpdateUnitInput,
} from './unit.types.js';

export class UnitController {
  static listUnits = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as UnitQuery;
    const result = await UnitService.listUnits(query);

    successResponse({
      res,
      message: 'Units retrieved successfully',
      data: result.units,
      meta: result.meta,
    });
  });

  static getUnitById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as UnitParams;
    const unit = await UnitService.getUnitById(id);

    successResponse({
      res,
      message: 'Unit retrieved successfully',
      data: unit,
    });
  });

  static createUnit = asyncHandler(async (req: Request, res: Response) => {
    const unit = await UnitService.createUnit(req.body as CreateUnitInput);

    successResponse({
      res,
      statusCode: 201,
      message: 'Unit created successfully',
      data: unit,
    });
  });

  static updateUnit = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as UnitParams;
    const unit = await UnitService.updateUnit(id, req.body as UpdateUnitInput);

    successResponse({
      res,
      message: 'Unit updated successfully',
      data: unit,
    });
  });

  static deleteUnit = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as UnitParams;
    const unit = await UnitService.deleteUnit(id);

    successResponse({
      res,
      message: 'Unit deleted successfully',
      data: unit,
    });
  });
}
