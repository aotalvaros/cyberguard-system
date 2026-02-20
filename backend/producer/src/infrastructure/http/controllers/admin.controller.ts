import { Router, Response } from 'express';
import Joi from 'joi';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { ServiceFactory } from '../../factories/ServiceFactory';
import { logger } from '../../config/logger';

const router = Router();

const VALID_ROLES = ['admin', 'analyst', 'viewer'] as const;
type ValidRole = typeof VALID_ROLES[number];

const updateRoleSchema = Joi.object({
  role: Joi.string().valid(...VALID_ROLES).required()
});

// Middleware: solo admins pueden acceder a estas rutas
function requireAdmin(req: AuthRequest, res: Response, next: () => void): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin role required' });
    return;
  }
  next();
}

/**
 * PATCH /api/admin/users/:username/role
 * Cambia el rol de un usuario en PostgreSQL.
 * Requiere JWT con role='admin'.
 */
router.patch(
  '/users/:username/role',
  authMiddleware,
  requireAdmin,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { username } = req.params;

    const { error, value } = updateRoleSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0]?.message ?? 'Invalid role' });
      return;
    }

    const newRole = (value as { role: ValidRole }).role;

    try {
      const userRepository = ServiceFactory.getUserRepository();

      const existingUser = await userRepository.findByUsername(username ?? '');
      if (!existingUser) {
        res.status(404).json({ error: `User '${username}' not found` });
        return;
      }

      // No permitir que un admin se quite el rol a sí mismo
      if (req.user?.username === username && newRole !== 'admin') {
        res.status(400).json({ error: 'Cannot downgrade your own admin role' });
        return;
      }

      const updated = await userRepository.update(existingUser.id, {
        role: newRole,
        updatedAt: new Date()
      });

      logger.info('User role updated', {
        username,
        oldRole: existingUser.role,
        newRole,
        changedBy: req.user?.username
      });

      res.status(200).json({
        success: true,
        user: {
          username: updated.username,
          role: updated.role,
          updatedAt: updated.updatedAt
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to update user role', { username, error: message });
      res.status(500).json({ error: 'Failed to update role' });
    }
  }
);

/**
 * GET /api/admin/users
 * Lista todos los usuarios (sin datos sensibles).
 * Requiere JWT con role='admin'.
 */
router.get(
  '/users',
  authMiddleware,
  requireAdmin,
  async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userRepository = ServiceFactory.getUserRepository();
      const users = await userRepository.findAll();

      res.status(200).json({
        users: users.map(u => ({
          username: u.username,
          role: u.role,
          isLocked: u.isLocked,
          lastLogin: u.lastLogin,
          createdAt: u.createdAt
        })),
        total: users.length
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to list users', { error: message });
      res.status(500).json({ error: 'Failed to retrieve users' });
    }
  }
);

export default router;
