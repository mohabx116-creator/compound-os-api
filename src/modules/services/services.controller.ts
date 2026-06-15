import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { successResponse } from '../../common/utils/api-response.js';
import { ServicesService } from './services.service.js';
import type {
  AdminServiceItemQuery,
  CreateServiceCategoryInput,
  CreateServiceItemInput,
  CreateServiceRequestInput,
  ServiceCategoryQuery,
  ServiceCategoryIdParams,
  ServiceCategorySlugParams,
  ServiceItemIdParams,
  PublicServiceItemQuery,
  ServiceItemSlugParams,
  ServiceRequestIdParams,
  ServiceRequestQuery,
  UpdateServiceCategoryInput,
  UpdateServiceItemInput,
  UpdateServiceRequestStatusInput,
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

  static listPublicCategories = asyncHandler(async (req: Request, res: Response) => {
    const result = await ServicesService.listPublicCategories(req.query as unknown as { compoundId?: string });

    successResponse({
      res,
      message: 'Service categories retrieved successfully',
      data: result.categories,
    });
  });

  static getPublicCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params as unknown as ServiceCategorySlugParams;
    const result = await ServicesService.getPublicCategoryBySlug(slug, req.query as unknown as { compoundId?: string });

    successResponse({
      res,
      message: 'Service category retrieved successfully',
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

  static createServiceRequest = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceItemIdParams;
    const request = await ServicesService.createServiceRequest(id, req.body as CreateServiceRequestInput);

    successResponse({
      res,
      statusCode: 201,
      message: 'Service request created successfully',
      data: request,
    });
  });

  static listAdminCategories = asyncHandler(async (req: Request, res: Response) => {
    const result = await ServicesService.listAdminCategories(req.query as unknown as ServiceCategoryQuery);

    successResponse({
      res,
      message: 'Service categories retrieved successfully',
      data: result.categories,
      meta: result.meta,
    });
  });

  static createAdminCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await ServicesService.createAdminCategory(req.body as CreateServiceCategoryInput);

    successResponse({
      res,
      statusCode: 201,
      message: 'Service category created successfully',
      data: category,
    });
  });

  static getAdminCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceCategoryIdParams;
    const category = await ServicesService.getAdminCategoryById(id);

    successResponse({
      res,
      message: 'Service category retrieved successfully',
      data: category,
    });
  });

  static updateAdminCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceCategoryIdParams;
    const category = await ServicesService.updateAdminCategory(id, req.body as UpdateServiceCategoryInput);

    successResponse({
      res,
      message: 'Service category updated successfully',
      data: category,
    });
  });

  static deleteAdminCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceCategoryIdParams;
    const result = await ServicesService.deleteAdminCategory(id);

    successResponse({
      res,
      message: 'Service category deleted successfully',
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

  static listAdminRequests = asyncHandler(async (req: Request, res: Response) => {
    const result = await ServicesService.listAdminRequests(req.query as unknown as ServiceRequestQuery);

    successResponse({
      res,
      message: 'Service requests retrieved successfully',
      data: result.requests,
      meta: result.meta,
    });
  });

  static getAdminRequestById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceRequestIdParams;
    const request = await ServicesService.getAdminRequestById(id);

    successResponse({
      res,
      message: 'Service request retrieved successfully',
      data: request,
    });
  });

  static updateAdminRequestStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ServiceRequestIdParams;
    const request = await ServicesService.updateAdminRequestStatus(id, req.body as UpdateServiceRequestStatusInput);

    successResponse({
      res,
      message: 'Service request status updated successfully',
      data: request,
    });
  });
}
