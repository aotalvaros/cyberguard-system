import { AuthProvider, LoginCredentials, AuthResult } from '../../domain/ports/AuthProvider';
import { TokenService } from '../../domain/ports/TokenService';
import { UserRepository } from '../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../domain/ports/AuditLogRepository';
import { logger } from '../../infrastructure/config/logger';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  constructor(
    private authProvider: AuthProvider,
    private tokenService: TokenService,
    private readonly userRepository: UserRepository,
    private readonly auditLogRepository: AuditLogRepository
  ) {}
  
  async login(
    credentials: LoginCredentials,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
   try {
      logger.info('Login attempt', { username: credentials.username });

      const result = await this.authProvider.authenticate(credentials);

      if (!result.success || !result.user) {
        await this.auditLogRepository.log({
          userId: undefined,
          action: 'login_failed',
          status: 'failure',
          ipAddress,
          userAgent,
          details: { username: credentials.username, reason: result.error ?? 'Invalid credentials' }
        }).catch((err: unknown) => {
          logger.error('Failed to log audit', { error: err instanceof Error ? err.message : String(err) });
        });

        logger.warn('Failed login attempt', {
          username: credentials.username,
          error: result.error ?? 'Invalid credentials'
        });

        return result;
      }

      // Buscar usuario en PostgreSQL.
      // Normalizar: si viene 'admin@cyberguard.com' intentar primero con la parte
      // local ('admin') para respetar el seed, y si no, buscar con el email completo.
      const rawUsername = result.user.username;
      const localUsername = rawUsername.includes('@') ? rawUsername.split('@')[0]! : rawUsername;
      let user =
        (await this.userRepository.findByUsername(localUsername)) ??
        (await this.userRepository.findByUsername(rawUsername));

      // Si no existe en PostgreSQL → crear automáticamente con rol 'viewer'
      if (!user) {
        logger.info('User authenticated in Firebase but not found in PostgreSQL. Creating automatically.', {
          username: result.user.username
        });

        const newUser: import('../../domain/ports/UserRepository').UserRecord = {
          id: uuidv4(),
          username: result.user.username,
          email: result.user.username,
          role: result.user.role,
          fullName: null,
          isActive: true,
          isLocked: false,
          failedAttempts: 0,
          lastLogin: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await this.userRepository.save(newUser);
        user = newUser;

        await this.auditLogRepository.log({
          userId: user.id,
          action: 'user_auto_created',
          status: 'success',
          ipAddress,
          userAgent,
          details: { username: user.username, role: user.role, source: 'firebase_auto_sync' }
        }).catch((err: unknown) => {
          logger.error('Failed to log audit', { error: err instanceof Error ? err.message : String(err) });
        });
      }

      // After the if(!user) block above, user is guaranteed non-null
      // TypeScript needs an explicit guard because of async ops inside the if
      if (!user) {
        return { success: false, error: 'User could not be resolved.' };
      }

      // Verificar si la cuenta está bloqueada
      if (user.isLocked) {
        await this.auditLogRepository.log({
          userId: user.id,
          action: 'login_blocked',
          status: 'failure',
          ipAddress,
          userAgent,
          details: { username: user.username, reason: 'Account is locked' }
        }).catch((err: unknown) => {
          logger.error('Failed to log audit', { error: err instanceof Error ? err.message : String(err) });
        });

        return { success: false, error: 'Account is locked. Contact administrator.' };
      }

      // Resetear intentos fallidos y actualizar último login
      await this.userRepository.resetFailedAttempts(user.id);
      await this.userRepository.updateLastLogin(user.id);

      // Generar JWT
      const token = this.tokenService.generateToken({
        id: user.id,
        username: user.username,
        role: user.role
      });

      // Registrar login exitoso
      await this.auditLogRepository.log({
        userId: user.id,
        action: 'login_success',
        status: 'success',
        ipAddress,
        userAgent,
        details: { username: user.username, role: user.role }
      }).catch((err: unknown) => {
        logger.error('Failed to log audit', { error: err instanceof Error ? err.message : String(err) });
      });

      logger.info('User logged in successfully', { username: user.username });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username, 
          role: user.role
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Login error', { error: errorMessage });
      return { success: false, error: 'Authentication failed' };
    }
  }
}
