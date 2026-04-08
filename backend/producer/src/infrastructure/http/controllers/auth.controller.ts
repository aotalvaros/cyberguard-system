import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { LoginRequest, LoginResponse } from '../../../types';
import { bruteForceDetection } from '../middlewares/bruteforce.middleware';
import { createAuthService } from '../../../infrastructure/factories/AuthServiceFactory';

const router = Router();
router.use(bruteForceDetection);

const authService = createAuthService(); // Firebase ahora, PostgreSQL mañana

const loginSchema = Joi.object({
  username: Joi.string().min(3).required(),
  password: Joi.string().min(6).required()
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { error, value } = loginSchema.validate(req.body);
  
  if (error) {
    const firstDetail = error.details[0];
    res.status(400).json({ error: firstDetail ? firstDetail.message : /* istanbul ignore next */ 'Validation failed' });
    return;
  }

  const credentials = value as LoginRequest;
  
  const result = await authService.login(credentials);
  
  if (!result.success) {
    res.status(401).json({ error: result.error });
    return;
  }
  
  const response: LoginResponse = {
    token: result.token!,
    user: { 
      username: result.user!.username, 
      role: result.user!.role 
    }
  };
  
  res.json(response);
});

export default router;