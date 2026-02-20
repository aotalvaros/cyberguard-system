import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../infrastructure/config/logger';

interface HttpError extends Error {
  status?: number;
}

export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error('Error handler', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status ?? 500).json({
    error: 'Internal server error'
  });
}
