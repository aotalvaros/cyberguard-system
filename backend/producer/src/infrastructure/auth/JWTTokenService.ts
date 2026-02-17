import jwt from 'jsonwebtoken';
import { TokenService, TokenPayload } from '../../domain/ports/TokenService';
import { config } from '../../config/env';

export class JWTTokenService implements TokenService {
  generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '8h' });
  }
  
  verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch {
      return null;
    }
  }
}