import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { ServiceFactory } from '../../factories/ServiceFactory';
import { logger } from '../../config/logger';
import { createUserSchema, updateUserSchema, toggleStatusSchema } from '../validators/user.schema';
import { UserAlreadyExistsError } from '../../../domain/exceptions/UserAlreadyExistsError';
import { UserNotFoundError } from '../../../domain/exceptions/UserNotFoundError';
import { SelfModificationForbiddenError } from '../../../domain/exceptions/SelfModificationForbiddenError';

const router = Router();

function requireAdmin(req: AuthRequest, res: Response, next: () => void): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin role required' });
    return;
  }
  next();
}

router.post(
  '/users',
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { error, value } = createUserSchema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({ error: error.details[0]?.message ?? 'Invalid input' });
      return;
    }

    try {
      const useCase = ServiceFactory.getCreateUserUseCase();
      const result  = await useCase.execute(value, req.user?.id ?? '');

      logger.info('User created via admin', { userId: result.user.id, role: result.user.role, createdBy: req.user?.id });

      res.status(201).json({ success: true, user: result.user });
    } catch (err: unknown) {
      if (err instanceof UserAlreadyExistsError) {
        res.status(409).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to create user', { error: message });
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

router.get(
  '/users',
  authMiddleware,
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const useCase = ServiceFactory.getListUsersUseCase();
      const result  = await useCase.execute();

      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to list users', { error: message });
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  }
);

router.get(
  '/users/:id',
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userRepository = ServiceFactory.getUserRepository();
      const user = await userRepository.findById(req.params.id ?? '');

      if (!user) {
        res.status(404).json({ error: `User '${req.params.id}' not found` });
        return;
      }

      res.status(200).json({ user });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to get user', { userId: req.params.id, error: message });
      res.status(500).json({ error: 'Failed to retrieve user' });
    }
  }
);

router.put(
  '/users/:id',
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { error, value } = updateUserSchema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({ error: error.details[0]?.message ?? 'Invalid input' });
      return;
    }

    try {
      const useCase = ServiceFactory.getUpdateUserUseCase();
      const result  = await useCase.execute({
        id:          req.params.id ?? '',
        fullName:    value.fullName,
        role:        value.role,
        requestedBy: req.user?.id ?? '',
      });

      logger.info('User updated via admin', { userId: req.params.id, updatedBy: req.user?.id });

      res.status(200).json({ success: true, user: result.user });
    } catch (err: unknown) {
      if (err instanceof UserNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof SelfModificationForbiddenError) {
        res.status(400).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to update user', { userId: req.params.id, error: message });
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

router.patch(
  '/users/:id/status',
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { error, value } = toggleStatusSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0]?.message ?? 'Invalid input' });
      return;
    }

    try {
      const useCase = ServiceFactory.getToggleUserStatusUseCase();
      const result  = await useCase.execute({
        id:          req.params.id ?? '',
        isActive:    value.isActive,
        requestedBy: req.user?.id ?? '',
      });

      const action = value.isActive ? 'reactivated' : 'deactivated';
      logger.info(`User ${action} via admin`, {
        userId:      req.params.id,
        changedBy:   req.user?.id,
        reassigned:  result.reassignedIncidents,
      });

      res.status(200).json({
        success: true,
        user:    result.user,
        reassignedIncidents: result.reassignedIncidents,
      });
    } catch (err: unknown) {
      if (err instanceof UserNotFoundError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof SelfModificationForbiddenError) {
        res.status(400).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to toggle user status', { userId: req.params.id, error: message });
      res.status(500).json({ error: 'Failed to toggle user status' });
    }
  }
);

export default router;
