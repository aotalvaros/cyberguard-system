import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { logger } from '../config/logger';
import { config } from '../config/env';
import { LoginRequest, LoginResponse } from '../types';

const router = Router();

// ⚠️ HUMAN CHECK:
// Credenciales desde variables de entorno, no hardcodeadas.
// Mejora sugerida por el equipo para evitar exponer credenciales en código.
const HARDCODED_USER = {
  username: config.adminUsername,
  password: config.adminPassword,
  role: 'admin'
};

const loginSchema = Joi.object({
  username: Joi.string().min(3).required(),
  password: Joi.string().min(6).required()
});

router.post('/login', (req: Request, res: Response) => {
  const { error, value } = loginSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { username, password } = value as LoginRequest;

  // ⚠️ HUMAN CHECK:
  // La IA validaba usuario y contraseña en una sola condición.
  // Separamos validaciones para mejor seguridad y logs específicos.
  if (username !== HARDCODED_USER.username) {
    logger.warn('Failed login attempt - user not found', { username });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (password !== HARDCODED_USER.password) {
    logger.warn('Failed login attempt - invalid password', { username });
    return res.status(401).json({ error: 'Invalid password' });
  }

  // ⚠️ HUMAN CHECK:
  // La IA sugirió tokens sin expiración.
  // Implementamos expiración de 8h para seguridad.
  const token = jwt.sign(
    { username, role: HARDCODED_USER.role },
    config.jwtSecret,
    { expiresIn: '8h' }
  );

  logger.info('User logged in', { username });
  
  const response: LoginResponse = {
    token,
    user: { username, role: HARDCODED_USER.role }
  };

  res.json(response);
});

export default router;
