import { AuthProvider, LoginCredentials, AuthResult } from '../../domain/ports/AuthProvider';
import { TokenService } from '../../domain/ports/TokenService';
import { logger } from '../../config/logger';

export class AuthService {
  constructor(
    private authProvider: AuthProvider,
    private tokenService: TokenService
  ) {}
  
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      logger.info('Login attempt', { username: credentials.username });
      
      const result = await this.authProvider.authenticate(credentials);
      
      if (!result.success) {
        logger.warn('Failed login attempt', { 
          username: credentials.username,
          error: result.error 
        });
        return result;
      }
      
      // Generar nuestro propio JWT (consistente entre providers)
      const token = this.tokenService.generateToken({
        username: result.user!.username,
        role: result.user!.role
      });
      
      logger.info('User logged in successfully', { 
        username: result.user!.username 
      });
      
      return {
        success: true,
        user: result.user,
        token
      };
      
    } catch (error: any) {
      logger.error('Login error', { error: error.message });
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }
}