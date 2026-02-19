import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../../infrastructure/config/env';
import { logger } from '../../../infrastructure/config/logger';

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
  } catch (error: unknown) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired token attempt', { error: error.message });
      return res.status(401).json({ error: 'Token expired' });
    }

    if (error instanceof jwt.NotBeforeError) {
      logger.warn('Token not yet valid', { error: error.message });
      return res.status(401).json({ error: 'Token not yet valid' });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token attempt', { error: error.message });
      return res.status(401).json({ error: 'Invalid token' });
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error('Token verification error', { error: message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
