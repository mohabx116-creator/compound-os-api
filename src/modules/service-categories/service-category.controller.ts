import { Request, Response } from 'express';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { ServiceCategoryService } from './service-category.service.js';
import type {
  ServiceCategoryParams,
  ServiceCategoryQuery,
} from './service-category.types.js';

export class ServiceCategoryController {
  static listServiceCategories = asyncHandler(
    async (req: Request, res: Response) => {
      const query = req.query as unknown as ServiceCategoryQuery;
      const result = await ServiceCategoryService.listServiceCategories(query);

      successResponse({
        res,
        message: 'Service categories retrieved successfully',
        data: result.categories,
        meta: result.meta,
      });
    },
  );

  static getServiceCategoryById = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params as unknown as ServiceCategoryParams;
      const category =
        await ServiceCategoryService.getServiceCategoryById(id);

      successResponse({
        res,
        message: 'Service category retrieved successfully',
        data: category,
      });
    },
  );
}
