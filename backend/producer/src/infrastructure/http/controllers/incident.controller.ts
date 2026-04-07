import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { ServiceFactory } from '../../factories/ServiceFactory';
import { logger } from '../../config/logger';
import { createIncidentSchema } from '../validators/incident.schema';
import {
  ThreatNotFoundForIncidentError,
  InvalidIncidentCreationError,
  DuplicateIncidentError,
} from '../../../domain/exceptions/IrmsExceptions';

const router = Router();

function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: () => void): void => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      res.status(403).json({ error: `Forbidden: one of [${roles.join(', ')}] role required` });
      return;
    }
    next();
  };
}


router.post(
  '/',
  authMiddleware,
  requireRole(['admin', 'soc_analyst']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { error, value } = createIncidentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      res.status(400).json({ error: error.details[0]?.message ?? 'Invalid input' });
      return;
    }

    try {
      const useCase = ServiceFactory.getCreateIncidentUseCase();
      const result  = await useCase.execute({
        threatId:  value.threatId,
        createdBy: req.user?.id ?? '',
      });

      logger.info('Incident created', { incidentId: result.incident.id, createdBy: req.user?.id });

      res.status(201).json({ success: true, incident: result.incident });
    } catch (err: unknown) {
      if (err instanceof ThreatNotFoundForIncidentError) {
        res.status(404).json({ error: err.message });
        return;
      }
      if (err instanceof InvalidIncidentCreationError) {
        res.status(422).json({ error: err.message });
        return;
      }
      if (err instanceof DuplicateIncidentError) {
        res.status(409).json({ error: err.message });
        return;
      }
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to create incident', { error: message });
      res.status(500).json({ error: 'Failed to create incident' });
    }
  },
);


router.get(
  '/',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const filters: { status?: string; severity?: string } = {};
      if (typeof req.query.status   === 'string') filters.status   = req.query.status;
      if (typeof req.query.severity === 'string') filters.severity = req.query.severity;

      const useCase = ServiceFactory.getListIncidentsUseCase();
      const result  = await useCase.execute(filters);

      res.status(200).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to list incidents', { error: message });
      res.status(500).json({ error: 'Failed to retrieve incidents' });
    }
  },
);


router.get(
  '/:id',
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const repo     = ServiceFactory.getIncidentRepository();
      const incident = await repo.findById(req.params.id ?? '');

      if (!incident) {
        res.status(404).json({ error: `Incident '${req.params.id}' not found` });
        return;
      }

      res.status(200).json({ incident });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error('Failed to get incident by id', { id: req.params.id, error: message });
      res.status(500).json({ error: 'Failed to retrieve incident' });
    }
  },
);

export default router;
