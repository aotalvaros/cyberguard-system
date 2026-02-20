import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../../../infrastructure/config/logger';

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation failed', { details });

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details,
      });
      return;
    }

    req.body = value;
    next();
  };
}
