import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { ServiceFactory } from '../../factories/ServiceFactory';
import { saveNotifPreferencesSchema } from '../validators/saveNotifPreferences.schema';
import { logger } from '../../config/logger';

export const profileNotificationsRouter = Router();

profileNotificationsRouter.get(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const username = req.user!.username;
    try {
      const useCase = ServiceFactory.getGetNotifPrefsUseCase();
      const prefs = await useCase.execute({ username });
      res.status(200).json(prefs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('GetNotifPrefs error', { username, error: message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

profileNotificationsRouter.put(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { error, value } = saveNotifPreferencesSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: error.details[0]?.message ??  'Validation error',
      });
      return;
    }

    const username = req.user!.username;
    try {
      const useCase = ServiceFactory.getSaveNotifPrefsUseCase();
      await useCase.execute({ username, ...value });
      res.status(200).json({ message: 'Notification preferences updated successfully' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('SaveNotifPrefs error', { username, error: message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
