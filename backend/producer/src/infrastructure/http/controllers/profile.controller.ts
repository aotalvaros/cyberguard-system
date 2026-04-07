import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { updateProfileSchema } from '../validators/updateProfile.schema';
import { ServiceFactory } from '../../factories/ServiceFactory';
import { DomainError } from '../../../domain/exceptions/DomainError';
import { logger } from '../../config/logger';

const router = Router();

router.get(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const username = req.user!.username;

    try {
      const useCase = ServiceFactory.getGetAdminProfileUseCase();
      const profile = await useCase.execute({ username });

      res.status(200).json(profile);
    } catch (err: unknown) {
      if (err instanceof DomainError) {
        const status = domainErrorToStatus(err.code);
        logger.warn('GetAdminProfile domain error', { username, code: err.code });
        res.status(status).json({ error: err.message, code: err.code });
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      logger.error('GetAdminProfile unexpected error', { username, error: message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

router.patch(
  '/',
  authMiddleware,
  validate(updateProfileSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const username = req.user!.username;

    try {
      const useCase = ServiceFactory.getUpdateAdminProfileUseCase();
      const updated = await useCase.execute({ username, data: req.body });

      logger.info('Profile updated', { username });
      res.status(200).json(updated);
    } catch (err: unknown) {
      if (err instanceof DomainError) {
        const status = domainErrorToStatus(err.code);
        logger.warn('UpdateAdminProfile domain error', { username, code: err.code });
        res.status(status).json({ error: err.message, code: err.code });
        return;
      }

      const message = err instanceof Error ? err.message : String(err);
      logger.error('UpdateAdminProfile unexpected error', { username, error: message });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

function domainErrorToStatus(code: string): number {
  const map: Record<string, number> = {
    PROFILE_NOT_FOUND:              404,
    EMAIL_ALREADY_EXISTS:           409,
    ROLE_MODIFICATION_NOT_ALLOWED:  400,
  };
  return map[code] ?? 400;
}

export default router;
