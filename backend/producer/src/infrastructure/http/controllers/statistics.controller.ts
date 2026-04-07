import { Router, type Request, type Response } from 'express';
import { logger } from '../../config/logger';
import { ServiceFactory } from '../../factories/ServiceFactory';
import { authMiddleware } from '../middlewares/auth.middleware';

export const statisticsRouter = Router();

statisticsRouter.get(
  '/',
  authMiddleware,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const useCase = ServiceFactory.getStatisticsUseCase();
      const stats = await useCase.execute();

      logger.info('Statistics retrieved successfully', {
        totalThreats: stats.totalThreats,
      });

      res.json({ success: true, data: stats });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to retrieve statistics', { error: message });
      res
        .status(500)
        .json({ success: false, error: 'Failed to retrieve statistics' });
    }
  }
);
