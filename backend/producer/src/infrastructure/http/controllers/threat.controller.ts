import { Router, Request, Response } from 'express';
import { logger } from '../../../infrastructure/config/logger';
import { ServiceFactory } from '../../../infrastructure/factories/ServiceFactory';
import { authMiddleware } from '../middlewares/auth.middleware';
import { bruteForceDetection } from '../middlewares/bruteforce.middleware';


const router = Router();


router.use(authMiddleware);
router.use(bruteForceDetection);

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {

    const threatService = ServiceFactory.getThreatService();
    

    const threatId = await threatService.reportThreat(req.body);

    logger.info('Threat reported successfully', { threatId });

    res.status(201).json({
      success: true,
      threatId,
      message: 'Threat reported successfully'
    });
  } catch (error: any) {
    logger.error('Failed to report threat', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to report threat'
    });
  }
});


router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {

    const listThreatsUseCase = ServiceFactory.getListThreatsUseCase();

    const result = await listThreatsUseCase.execute();

    logger.info('Threats retrieved', { total: result.total });
 
    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Failed to list threats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve threats'
    });
  }
});

export default router;
