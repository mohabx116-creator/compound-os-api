import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { successResponse } from '../../common/utils/api-response.js';
import { ServicesService } from './services.service.js';
import type {
  AdminServiceItemQuery,
  CreateServiceItemInput,
  ServiceItemIdParams,
  PublicServiceItemQuery,
  ServiceItemSlugParams,
  UpdateServiceItemInput,
} from './services.types.js';

export class ServicesController {
  static getServicesHome = asyncHandler(async (req: Request, res: Response) => {
    const result = await ServicesService.getServicesHome(req.query as unknown as { compoundId?: string });

    successResponse({
      res,
      message: 'Services retrieved successfully',
      data: result,
    });
  });

  static listPublicItems = asyncHandler(async (req: Request, res: Response) => {
    const result = await ServicesService.listPublicItems(req.query as unknown as PublicServiceItemQuery);

    successResponse({
      res,
      message: 'Service items retrieved successfully',
      data: result.items,
      meta: result.meta,
    });
  });

  static getPublicItemBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params as unknown as ServiceItemSlugParams;
    const result = await ServicesService.getPublicItemBySlug(slug, req.query as unknown as { compoundId?: string });

    successResponse({
      res,
      message: 'Service item retrieved successfully',
      data: result,
    });
  });

  static listAdminItems = asyncHandler(async (req: Request, res: Response) => {
    const result = await ServicesService.listAdminItems(req.query as unknown as AdminServiceItemQuery);

    successResponse({
      res,
      message: 'Service items retrieved successfully',
      data: result.items,
      meta: result.meta,
    });
  });

  static getAdminItemById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceItemIdParams;
    const item = await ServicesService.getAdminItemById(id);

    successResponse({
      res,
      message: 'Service item retrieved successfully',
      data: item,
    });
  });

  static createAdminItem = asyncHandler(async (req: Request, res: Response) => {
    const item = await ServicesService.createAdminItem(req.body as CreateServiceItemInput);

    successResponse({
      res,
      statusCode: 201,
      message: 'Service item created successfully',
      data: item,
    });
  });

  static updateAdminItem = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceItemIdParams;
    const item = await ServicesService.updateAdminItem(id, req.body as UpdateServiceItemInput);

    successResponse({
      res,
      message: 'Service item updated successfully',
      data: item,
    });
  });

  static deleteAdminItem = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceItemIdParams;
    const result = await ServicesService.deleteAdminItem(id);

    successResponse({
      res,
      message: 'Service item deleted successfully',
      data: result,
    });
  });
}
