import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

export function validateDto(dtoClass: new () => object) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const dtoObject = plainToClass(dtoClass, req.body);
    const errors: ValidationError[] = await validate(dtoObject);

    if (errors.length > 0) {
      const formattedErrors = errors.map((error: ValidationError) => ({
        property: error.property,
        constraints: error.constraints,
      }));

      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: formattedErrors,
        },
      });
      return;
    }

    req.body = dtoObject;
    next();
  };
}