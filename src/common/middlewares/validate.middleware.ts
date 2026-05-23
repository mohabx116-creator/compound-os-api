import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

export interface ValidationSchemas {
  body?: AnyZodObject | ZodEffects<any>;
  params?: AnyZodObject | ZodEffects<any>;
  query?: AnyZodObject | ZodEffects<any>;
}

export const validate = (schemas: ValidationSchemas): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
