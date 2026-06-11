// [generated]
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// TODO: implement request validation middleware using Zod
const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ errors: error.errors });
      } else {
        next(error);
      }
    }
  };
};

export default validate;
