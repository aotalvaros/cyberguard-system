import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { logger } from '../config/logger';

export interface AuthRequest extends Request {
  user?: {
    username: string;
    role: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  try {
    // ⚠️ HUMAN CHECK:
    // La IA no manejaba correctamente tokens expirados vs inválidos.
    // Se agrego manejo específico de errores de JWT.
    const decoded = jwt.verify(token, config.jwtSecret) as { username: string; role: string };
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Expired token attempt', { error: error.message });
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      logger.warn('Invalid token attempt', { error: error.message });
      return res.status(401).json({ error: 'Invalid token' });
    }

    logger.error('Token verification error', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
