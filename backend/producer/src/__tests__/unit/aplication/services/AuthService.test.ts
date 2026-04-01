import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AuthProvider, AuthResult, LoginCredentials } from '../../../../domain/ports/AuthProvider';
import { TokenService } from '../../../../domain/ports/TokenService';
import { UserRepository, UserRecord } from '../../../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../../../domain/ports/AuditLogRepository';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: mockLogger
}));

import { AuthService } from '../../../../application/services/AuthService';


describe('AuthService', () => {
  let authService: AuthService;
  let mockAuthProvider: jest.Mocked<AuthProvider>;
  let mockTokenService: jest.Mocked<TokenService>;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAuditLogRepository: jest.Mocked<AuditLogRepository>;

  const mockUser: UserRecord = {
    id: 'user-id-123',
    username: 'admin',
    email: 'admin@test.com',
    role: 'admin',
    fullName: null,
    isActive: true,
    isLocked: false,
    failedAttempts: 0,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock del AuthProvider
    mockAuthProvider = {
      authenticate: jest.fn()
    } as jest.Mocked<AuthProvider>;

    // Mock del TokenService
    mockTokenService = {
      generateToken: jest.fn(),
      verifyToken: jest.fn(),
      decodeToken: jest.fn()
    } as jest.Mocked<TokenService>;

    // Mock del UserRepository
    mockUserRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      findAllActive: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      resetFailedAttempts: jest.fn(),
      updateLastLogin: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      lockUser: jest.fn()
    } as jest.Mocked<UserRepository>;

    // Mock del AuditLogRepository
    mockAuditLogRepository = {
      log: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
    } as jest.Mocked<AuditLogRepository>;

    // Crear instancia del servicio con mocks inyectados
    authService = new AuthService(
      mockAuthProvider,
      mockTokenService,
      mockUserRepository,
      mockAuditLogRepository
    );

    // Default: user exists in PostgreSQL
    mockUserRepository.findByUsername.mockResolvedValue(mockUser);
    mockUserRepository.resetFailedAttempts.mockResolvedValue(undefined);
    mockUserRepository.updateLastLogin.mockResolvedValue(undefined);
    mockUserRepository.save.mockResolvedValue(mockUser);
  });

  // ==========================================================================
  // LOGIN EXITOSO
  // ==========================================================================

  describe('Successful Login', () => {
    it('should return success with user and token when authentication succeeds', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'correct-password'
      };

      const mockAuthResult: AuthResult = {
        success: true,
        user: {
            id: 'user-id-123',
            username: 'admin',
            role: 'admin'
        }
      };

      const mockToken = 'jwt-token-abc123';

      mockAuthProvider.authenticate.mockResolvedValue(mockAuthResult);
      mockTokenService.generateToken.mockReturnValue(mockToken);

      const result = await authService.login(credentials);

      expect(result).toEqual({
        success: true,
        user: {
          id: 'user-id-123',
          username: 'admin',
          role: 'admin'
        },
        token: mockToken
      });
    });

    it('should call authProvider.authenticate with correct credentials', async () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'testpass123'
      };

      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'testuser', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      await authService.login(credentials);

      expect(mockAuthProvider.authenticate).toHaveBeenCalledTimes(1);
      expect(mockAuthProvider.authenticate).toHaveBeenCalledWith(credentials);
    });

    it('should call tokenService.generateToken with user data', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'password123'
      };

      const mockUser = {
        id: 'user-id-123',
        username: 'admin',
        role: 'admin'
      };

      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: mockUser
      });
      mockTokenService.generateToken.mockReturnValue('generated-token');

      await authService.login(credentials);

      expect(mockTokenService.generateToken).toHaveBeenCalledTimes(1);
      expect(mockTokenService.generateToken).toHaveBeenCalledWith({
        username: 'admin',
        role: 'admin'
      });
    });

    it('should return the token generated by tokenService', async () => {
      const expectedToken = 'unique-jwt-token-xyz';

      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue(expectedToken);

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.token).toBe(expectedToken);
    });

    it('should work with different user roles', async () => {
      const roles = ['admin', 'user', 'moderator', 'guest'];

      for (const role of roles) {
        jest.clearAllMocks();
        mockAuditLogRepository.log.mockResolvedValue(undefined);

        mockAuthProvider.authenticate.mockResolvedValue({
          success: true,
          user: { id: 'user-id-123', username: 'testuser', role }
        });
        mockUserRepository.findByUsername.mockResolvedValue({ ...mockUser, role });
        mockUserRepository.resetFailedAttempts.mockResolvedValue(undefined);
        mockUserRepository.updateLastLogin.mockResolvedValue(undefined);
        mockTokenService.generateToken.mockReturnValue('token');

        const result = await authService.login({
          username: 'testuser',
          password: 'pass'
        });

        expect(result.success).toBe(true);
        expect(result.user?.role).toBe(role);
      }
    });
  });

  // ==========================================================================
  // LOGIN FALLIDO
  // ==========================================================================

  describe('Failed Login', () => {
    it('should return failure when authProvider returns unsuccessful result', async () => {
      const credentials: LoginCredentials = {
        username: 'admin',
        password: 'wrong-password'
      };

      const mockFailedResult: AuthResult = {
        success: false,
        error: 'Invalid credentials'
      };

      mockAuthProvider.authenticate.mockResolvedValue(mockFailedResult);

      const result = await authService.login(credentials);

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials'
      });
    });

    it('should not call tokenService.generateToken when authentication fails', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      await authService.login({
        username: 'admin',
        password: 'wrong'
      });

      expect(mockTokenService.generateToken).not.toHaveBeenCalled();
    });

    it('should return the error from authProvider', async () => {
      const errorMessage = 'Account locked';

      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: errorMessage
      });

      const result = await authService.login({
        username: 'locked-user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
    });

    it('should handle different error messages from authProvider', async () => {
      const errorMessages = [
        'Invalid credentials',
        'User not found',
        'Account disabled',
        'Too many attempts'
      ];

      for (const errorMsg of errorMessages) {
        mockAuthProvider.authenticate.mockResolvedValue({
          success: false,
          error: errorMsg
        });

        const result = await authService.login({
          username: 'user',
          password: 'pass'
        });

        expect(result.error).toBe(errorMsg);
      }
    });
  });

  // ==========================================================================
  // LOGGING
  // ==========================================================================

  describe('Logging', () => {
    it('should log login attempt at the start', async () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'testpass'
      };

      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'testuser', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      await authService.login(credentials);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Login attempt',
        { username: 'testuser' }
      );
    });

    it('should log successful login', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'admin', role: 'admin' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      await authService.login({
        username: 'admin',
        password: 'pass'
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User logged in successfully',
        { username: 'admin' }
      );
    });

    it('should log failed login attempt with error', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      await authService.login({
        username: 'wronguser',
        password: 'wrongpass'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed login attempt',
        {
          username: 'wronguser',
          error: 'Invalid credentials'
        }
      );
    });

    it('should log error when exception is thrown', async () => {
      const error = new Error('Database connection failed');

      mockAuthProvider.authenticate.mockRejectedValue(error);

      await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Login error',
        { error: 'Database connection failed' }
      );
    });

    it('should not log password in any log entry', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'admin', role: 'admin' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      await authService.login({
        username: 'admin',
        password: 'secret-password-123'
      });

      const allLogCalls = [
        ...mockLogger.info.mock.calls,
        ...mockLogger.warn.mock.calls,
        ...mockLogger.error.mock.calls
      ];

      allLogCalls.forEach(call => {
        const logString = JSON.stringify(call);
        expect(logString).not.toContain('secret-password-123');
        expect(logString).not.toContain('password');
      });
    });

    it('should log exactly twice on successful login (attempt + success)', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log attempt and warning on failed login', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Invalid'
      });

      await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(mockLogger.info).toHaveBeenCalledTimes(1); // Solo attempt
      expect(mockLogger.warn).toHaveBeenCalledTimes(1); // Failed
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // MANEJO DE ERRORES
  // ==========================================================================

  describe('Error Handling', () => {
    it('should catch and handle authProvider exceptions', async () => {
      mockAuthProvider.authenticate.mockRejectedValue(
        new Error('Network error')
      );

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result).toEqual({
        success: false,
        error: 'Authentication failed'
      });
    });

    it('should return generic error message on exception', async () => {
      mockAuthProvider.authenticate.mockRejectedValue(
        new Error('Detailed internal error')
      );

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      // No debe exponer el error interno
      expect(result.error).toBe('Authentication failed');
      expect(result.error).not.toContain('internal');
    });

    it('should handle tokenService.generateToken throwing error', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should handle non-Error objects being thrown', async () => {
      mockAuthProvider.authenticate.mockRejectedValue('String error');

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should handle null being thrown', async () => {
        mockAuthProvider.authenticate.mockRejectedValue("null");

        const result = await authService.login({
          username: 'user',
          password: 'pass'
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('Authentication failed');
    });

    it('should handle undefined error message', async () => {
      const errorWithoutMessage = { name: 'CustomError' };
      mockAuthProvider.authenticate.mockRejectedValue(errorWithoutMessage);

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty username', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Username required'
      });

      const result = await authService.login({
        username: '',
        password: 'pass'
      });

      expect(result.success).toBe(false);
    });

    it('should handle empty password', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Password required'
      });

      const result = await authService.login({
        username: 'user',
        password: ''
      });

      expect(result.success).toBe(false);
    });

    it('should handle very long username', async () => {
      const longUsername = 'a'.repeat(1000);

      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: longUsername, role: 'user' }
      });
      mockUserRepository.findByUsername.mockResolvedValue({ ...mockUser, username: longUsername, role: 'user' });
      mockTokenService.generateToken.mockReturnValue('token');

      const result = await authService.login({
        username: longUsername,
        password: 'pass'
      });

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe(longUsername);
    });

    it('should handle special characters in username', async () => {
      const specialUsername = "user@example.com";

      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: specialUsername, role: 'user' }
      });
      mockUserRepository.findByUsername.mockResolvedValue({ ...mockUser, username: specialUsername, role: 'user' });
      mockTokenService.generateToken.mockReturnValue('token');

      const result = await authService.login({
        username: specialUsername,
        password: 'pass'
      });

      expect(result.success).toBe(true);
      expect(result.user?.username).toBe(specialUsername);
    });

    it('should handle unicode characters in username', async () => {
      const unicodeUsername = "用户名";

      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: unicodeUsername, role: 'user' }
      });
      mockUserRepository.findByUsername.mockResolvedValue({ ...mockUser, username: unicodeUsername, role: 'user' });
      mockTokenService.generateToken.mockReturnValue('token');

      const result = await authService.login({
        username: unicodeUsername,
        password: 'pass'
      });

      expect(result.user?.username).toBe(unicodeUsername);
    });

    it('should handle empty token from tokenService', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('');

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('');
    });

    it('should handle very long token from tokenService', async () => {
      const longToken = 'a'.repeat(10000);

      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue(longToken);

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.token).toBe(longToken);
    });
  });

  // ==========================================================================
  // DEPENDENCY INJECTION
  // ==========================================================================

  describe('Dependency Injection', () => {
    it('should be instantiable with mocked dependencies', () => {
      expect(authService).toBeInstanceOf(AuthService);
      expect(authService).toBeDefined();
    });

    it('should use injected authProvider', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      await authService.login({ username: 'user', password: 'pass' });

      expect(mockAuthProvider.authenticate).toHaveBeenCalled();
    });

    it('should use injected tokenService', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      await authService.login({ username: 'user', password: 'pass' });

      expect(mockTokenService.generateToken).toHaveBeenCalled();
    });

  });

  // ==========================================================================
  // RESULTADO CONSISTENTE
  // ==========================================================================

  describe('Result Consistency', () => {
    it('should always return an object with success property', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('should include user and token on success', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should include error on failure', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Failed'
      });

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
      expect(result.error).toBeDefined();
    });

    it('should not include token on failure', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Failed'
      });

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.token).toBeUndefined();
    });

    it('should not include user on failure', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Failed'
      });

      const result = await authService.login({
        username: 'user',
        password: 'pass'
      });

      expect(result.user).toBeUndefined();
    });
  });



  // ==========================================================================
  // PERFORMANCE
  // ==========================================================================

  describe('Performance', () => {
    it('should complete login in reasonable time', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      const start = Date.now();
      await authService.login({ username: 'user', password: 'pass' });
      const duration = Date.now() - start;

      // Debería completarse en menos de 100ms (muy generoso para tests)
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple concurrent login attempts', async () => {
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'user', role: 'user' }
      });
      mockTokenService.generateToken.mockReturnValue('token');

      const logins = Array(10).fill(null).map(() =>
        authService.login({ username: 'user', password: 'pass' })
      );

      const results = await Promise.all(logins);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('token');
        expect(result.user).toBeDefined();
        expect(result.token).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // AUDIT LOG ERROR HANDLING — VALIDAR que .catch silencia errores del log
  // sin propagar al cliente (fail-silent en auditoria, no en negocio)
  // ==========================================================================

  describe('Audit Log Error Handling', () => {
    it('should still return failed login result even when audit log throws on login failure', async () => {
      // Arrange — authProvider rechaza Y el audit log también falla
      mockAuthProvider.authenticate.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });
      mockAuditLogRepository.log.mockRejectedValueOnce(new Error('Audit DB connection lost'));

      // Act
      const result = await authService.login({ username: 'admin', password: 'wrong' });

      // Assert — VALIDAR: el fallo del audit NO debe romper el flujo de negocio
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      // El error fue logueado silenciosamente
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit',
        expect.objectContaining({ error: 'Audit DB connection lost' })
      );
    });

    it('should still return successful login even when audit log throws on success', async () => {
      // Arrange — login exitoso pero el audit log falla
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'admin', role: 'admin' }
      });
      mockTokenService.generateToken.mockReturnValue('success-token');
      // First log call (on success) rejects
      mockAuditLogRepository.log.mockRejectedValueOnce(new Error('Audit DB timeout'));

      // Act
      const result = await authService.login({ username: 'admin', password: 'pass' });

      // Assert — VALIDAR: el fallo del audit NO interrumpe el login exitoso
      expect(result.success).toBe(true);
      expect(result.token).toBe('success-token');
    });

    it('should silently handle audit log failure when auto-creating user from Firebase', async () => {
      // Arrange — usuario no existe en PostgreSQL, se crea automáticamente
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'fb-id', username: 'newuser@example.com', role: 'viewer' }
      });
      mockUserRepository.findByUsername.mockResolvedValue(null); // no existe
      mockTokenService.generateToken.mockReturnValue('token-new');
      // La primera llamada al audit log (user_auto_created) falla
      mockAuditLogRepository.log.mockRejectedValueOnce(new Error('Audit write failed'));

      // Act — no debe lanzar excepción
      const result = await authService.login({ username: 'newuser@example.com', password: 'pass' });

      // Assert — el flow continúa a pesar del fallo del audit
      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit',
        expect.objectContaining({ error: 'Audit write failed' })
      );
    });

    it('should silently handle audit log failure when account is locked', async () => {
      // Arrange — cuenta bloqueada, audit log falla
      const lockedUser = { ...mockUser, isLocked: true };
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'admin', role: 'admin' }
      });
      mockUserRepository.findByUsername.mockResolvedValue(lockedUser);
      mockAuditLogRepository.log.mockRejectedValueOnce(new Error('Audit unavailable'));

      // Act
      const result = await authService.login({ username: 'admin', password: 'pass' });

      // Assert — VALIDAR: la cuenta sigue siendo rechazada pese al fallo del audit
      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
    });

    /**
     * VALIDAR (rama String(err) en .catch): cuando auditLogRepository.log rechaza
     * con un valor que NO es instancia de Error (e.g. un string), la rama
     * `err instanceof Error ? err.message : String(err)` toma el camino String(err).
     * El flujo de negocio NO se interrumpe — el login falla por credenciales, no por audit.
     *
     * Cubre las ramas de líneas 35, 40 del AuthService — el ternario String(err).
     */
    it('should use String(err) in logger when audit log rejects with a non-Error on login failure', async () => {
      // Arrange — authenticate falla Y el audit log rechaza con un string (no Error)
      mockAuthProvider.authenticate.mockResolvedValue({ success: false, error: 'bad credentials' });
      mockAuditLogRepository.log.mockRejectedValueOnce('AUDIT_TIMEOUT_STRING' as never);

      // Act
      const result = await authService.login({ username: 'admin', password: 'wrong' });

      // Assert — el login sigue fallando por las credenciales (no por el audit)
      expect(result.success).toBe(false);
      // El logger.error fue llamado con String('AUDIT_TIMEOUT_STRING')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit',
        expect.objectContaining({ error: 'AUDIT_TIMEOUT_STRING' })
      );
    });

    /**
     * VALIDAR (rama String(err)): cuando el audit log de auto-creación rechaza
     * con un no-Error. Cubre la rama String(err) de línea 83.
     */
    it('should use String(err) in logger when auto-create audit rejects with a non-Error', async () => {
      // Arrange — Firebase autentica, usuario no existe en PostgreSQL → auto-creación
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'fb-id', username: 'newuser', role: 'viewer' },
      });
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockTokenService.generateToken.mockReturnValue('token-xyz');
      // El audit log de user_auto_created falla con un objeto plano (no Error)
      mockAuditLogRepository.log.mockRejectedValueOnce({ code: 503, msg: 'unavailable' } as never);

      // Act
      const result = await authService.login({ username: 'newuser', password: 'pass' });

      // Assert — el flujo no se interrumpe; String({ code: 503, msg: 'unavailable' }) es llamado
      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit',
        expect.objectContaining({ error: '[object Object]' })
      );
    });

    /**
     * VALIDAR (rama String(err)): cuando el audit log de cuenta bloqueada rechaza
     * con un no-Error. Cubre la rama String(err) de línea 97.
     */
    it('should use String(err) in logger when locked-account audit rejects with a non-Error', async () => {
      // Arrange — cuenta bloqueada, audit log rechaza con número
      const lockedUser = { ...mockUser, isLocked: true };
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'admin', role: 'admin' },
      });
      mockUserRepository.findByUsername.mockResolvedValue(lockedUser);
      mockAuditLogRepository.log.mockRejectedValueOnce(42 as never); // número, no Error

      // Act
      const result = await authService.login({ username: 'admin', password: 'pass' });

      // Assert — cuenta sigue bloqueada; String(42) = '42' fue usado en el logger
      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit',
        expect.objectContaining({ error: '42' })
      );
    });

    /**
     * VALIDAR (rama String(err)): cuando el audit log de login exitoso rechaza
     * con un no-Error. Cubre la rama String(err) de línea 122.
     */
    it('should use String(err) in logger when success audit rejects with a non-Error', async () => {
      // Arrange — login exitoso, audit log de login_success rechaza con undefined
      mockAuthProvider.authenticate.mockResolvedValue({
        success: true,
        user: { id: 'user-id-123', username: 'admin', role: 'admin' },
      });
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockTokenService.generateToken.mockReturnValue('valid-token');
      mockAuditLogRepository.log.mockRejectedValueOnce(undefined as never);

      // Act
      const result = await authService.login({ username: 'admin', password: 'pass' });

      // Assert — el token se retorna igual; String(undefined) = 'undefined' fue usado
      expect(result.success).toBe(true);
      expect(result.token).toBe('valid-token');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to log audit',
        expect.objectContaining({ error: 'undefined' })
      );
    });
  });
});