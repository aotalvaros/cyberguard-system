/**
 * Profile Controller
 *
 * Expone los endpoints REST para consulta y actualización del perfil del
 * administrador autenticado.
 *
 * Rutas:
 *   GET  /api/profile  → GetAdminProfileUseCase
 *   PATCH /api/profile → UpdateAdminProfileUseCase
 *
 * Seguridad: authMiddleware valida JWT en todas las rutas.
 * Validación: middleware validate() + Joi schema (updateProfileSchema).
 * Error mapping: DomainError codes → HTTP status codes.
 */
import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { updateProfileSchema } from '../validators/updateProfile.schema';
import { ServiceFactory } from '../../factories/ServiceFactory';
import { DomainError } from '../../../domain/exceptions/DomainError';
import { logger } from '../../config/logger';

const router = Router();

/**
 * GET /api/profile
 * Retorna el perfil del administrador autenticado.
 *
 * Response 200: { username, email, role, phone, createdAt }
 * Response 401: JWT inválido o ausente (authMiddleware)
 * Response 404: usuario no encontrado (ProfileNotFoundException)
 */
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

/**
 * PATCH /api/profile
 * Actualiza los datos de perfil del administrador autenticado.
 *
 * Body (al menos un campo): { username?, email?, phone? }
 * Response 200: { username, email, role, phone, createdAt }
 * Response 400: body inválido o intento de modificar role
 * Response 401: JWT inválido o ausente
 * Response 404: usuario no encontrado
 * Response 409: email ya en uso por otro usuario
 */
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

/**
 * Mapea DomainError.code a HTTP status code.
 * OCP §3.2: extender este mapa sin modificar los handlers.
 */
function domainErrorToStatus(code: string): number {
  const map: Record<string, number> = {
    PROFILE_NOT_FOUND:              404,
    EMAIL_ALREADY_EXISTS:           409,
    ROLE_MODIFICATION_NOT_ALLOWED:  400,
  };
  return map[code] ?? 400;
}

export default router;
