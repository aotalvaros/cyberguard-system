import { Router, Response } from 'express';
import Joi from 'joi';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { ThreatService } from '../services/threat.service';
import { threatStore } from '../services/threat.store';
import { logger } from '../config/logger';
import { ThreatRequest } from '../types';

const router = Router();
const threatService = new ThreatService();

const threatSchema = Joi.object({
  type: Joi.string().valid('malware', 'intrusion', 'phishing', 'ddos', 'ransomware').required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  sourceIp: Joi.string().ip().required(),
  targetIp: Joi.string().ip().optional(),
  description: Joi.string().min(10).max(500).required(),
  metadata: Joi.object().optional()
});

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { error, value } = threatSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const threatData = value as ThreatRequest;
    const threatId = await threatService.reportThreat(threatData);

    logger.info('Threat endpoint called', {
      threatId,
      user: req.user?.username,
      type: threatData.type
    });

    res.status(202).json({
      message: 'Threat reported successfully',
      threatId,
      status: 'processing'
    });

  } catch (error: any) {
    logger.error('Error reporting threat', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const threats = threatStore.getAll();
    
    logger.info('Threats list requested', {
      user: req.user?.username,
      count: threats.length
    });

    res.json({
      threats,
      total: threats.length
    });

  } catch (error: any) {
    logger.error('Error fetching threats', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
