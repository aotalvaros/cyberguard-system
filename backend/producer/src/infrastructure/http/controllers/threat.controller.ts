import { Router, Request, Response } from 'express';
import { logger } from '../../../infrastructure/config/logger';
import { ServiceFactory } from '../../../infrastructure/factories/ServiceFactory';
import { ThreatNotFoundException } from '../../../domain/exceptions/ThreatNotFoundException';
import { authMiddleware } from '../middlewares/auth.middleware';
import { bruteForceDetection } from '../middlewares/bruteforce.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createThreatSchema } from '../validators/threat.schema';


const router = Router();


router.use(authMiddleware);
router.use(bruteForceDetection);

router.post('/', validate(createThreatSchema), async (req: Request, res: Response): Promise<void> => {
  try {

    const threatService = ServiceFactory.getThreatService();
    

    const threatId = await threatService.reportThreat(req.body);

    logger.info('Threat reported successfully', { threatId });

    res.status(201).json({
      success: true,
      threatId,
      message: 'Threat reported successfully'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to report threat', { error: message });
    res.status(500).json({
      success: false,
      error: 'Failed to report threat'
    });
  }
});


router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {

    const listThreatsUseCase = ServiceFactory.getListThreatsUseCase();

    const result = await listThreatsUseCase.execute();

    logger.info('Threats retrieved', { total: result.total });
 
    res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to list threats', { error: message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve threats'
    });
  }
});


router.delete('/:threatId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { threatId } = req.params;

    const deleteThreatUseCase = ServiceFactory.getDeleteThreatUseCase();

    const result = await deleteThreatUseCase.execute(threatId ?? '');

    logger.info('Threat deleted', { threatId: result.threatId });

    res.status(200).json({
      success: true,
      threatId: result.threatId,
      message: result.message
    });
  } catch (error: unknown) {
    if (error instanceof ThreatNotFoundException) {
      logger.warn('Threat not found for deletion', {
        threatId: req.params.threatId,
        code: error.code
      });
      res.status(404).json({
        success: false,
        error: error.message
      });
      return;
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to delete threat', { error: message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete threat'
    });
  }
});

export default router;
