import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { LoginRequest, LoginResponse } from '../types';
import { bruteForceDetection } from '../middlewares/bruteforce.middleware';
import { createAuthService } from '../infrastructure/factories/AuthServiceFactory';

const router = Router();
router.use(bruteForceDetection);

const authService = createAuthService(); // Firebase ahora, PostgreSQL mañana

const loginSchema = Joi.object({
  username: Joi.string().min(3).required(),
  password: Joi.string().min(6).required()
});

router.post('/login', async (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const credentials = value as LoginRequest;
  
  // Delegar toda la lógica al servicio
  const result = await authService.login(credentials);
  
  if (!result.success) {
    return res.status(401).json({ error: result.error });
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