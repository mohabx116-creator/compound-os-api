import { Request, Response } from 'express';
import { successResponse } from '../../common/utils/api-response.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { ServiceProviderService } from './service-provider.service.js';
import type {
  ServiceProviderParams,
  ServiceProviderQuery,
} from './service-provider.types.js';

export class ServiceProviderController {
  static listServiceProviders = asyncHandler(
    async (req: Request, res: Response) => {
      const query = req.query as unknown as ServiceProviderQuery;
      const result = await ServiceProviderService.listServiceProviders(query);

      successResponse({
        res,
        message: 'Service providers retrieved successfully',
        data: result.providers,
        meta: result.meta,
      });
    },
  );

  static getServiceProviderById = asyncHandler(
    async (req: Request, res: Response) => {
      const { id } = req.params as unknown as ServiceProviderParams;
      const provider =
        await ServiceProviderService.getServiceProviderById(id);

      successResponse({
        res,
        message: 'Service provider retrieved successfully',
        data: provider,
      });
    },
  );
}
