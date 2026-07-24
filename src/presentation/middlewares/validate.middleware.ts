import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodType } from 'zod';

// Reusable body-validation middleware. On success it replaces req.body with
// the parsed (and type-narrowed) value; on failure it responds 400 directly
// without reaching the use case.
export function validateBody(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: 'Validation error',
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
