import { AuthResult } from '../../../../../domain/ports/AuthProvider';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';


const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockBruteForceDetection = jest.fn((_req: express.Request, _res: express.Response, next: express.NextFunction) => next());

// Mock del AuthService
const mockLogin = jest.fn<(credentials: { username: string; password: string }) => Promise<AuthResult>>();
const mockAuthService = {
  login: mockLogin
};

// Mock de la factory que crea el AuthService
const mockCreateAuthService = jest.fn(() => mockAuthService);

jest.mock('../../../../../infrastructure/config/logger', () => ({
  logger: mockLogger
}));

jest.mock('../../../../../infrastructure/http/middlewares/bruteforce.middleware', () => ({
  bruteForceDetection: mockBruteForceDetection
}));

jest.mock('../../../../../infrastructure/factories/AuthServiceFactory', () => ({
  createAuthService: mockCreateAuthService
}));


import authRoutes from '../../../../../infrastructure/http/controllers/auth.controller';
import '../../../../../infrastructure/config/logger';

describe('Auth Controller with AuthService', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockLogin.mockReset();
    mockBruteForceDetection.mockImplementation((_req, _res, next) => next());
    
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  // ==========================================================================
  // VALIDACIÓN DE ENTRADA
  // ==========================================================================

  describe('POST /api/auth/login - Input Validation', () => {
    it('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test123456' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('username');
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should return 400 when both fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should return 400 when username is too short (less than 3 characters)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ab', password: 'test123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('3 characters');
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should return 400 when password is too short (less than 6 characters)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('6 characters');
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should return 400 when username is empty string', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'test123456' });

      expect(response.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should return 400 when password is empty string', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: '' });

      expect(response.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should return 400 when body is malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AUTENTICACIÓN EXITOSA
  // ==========================================================================

  describe('POST /api/auth/login - Successful Authentication', () => {
    it('should return 200 with token and user when AuthService returns success', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: {
          username: 'admin',
          role: 'admin',
          id: 'user-id-123'
        },
        token: 'jwt-token-abc123'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'correct-password' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        token: 'jwt-token-abc123',
        user: {
          username: 'admin',
          role: 'admin'
        }
      });
    });

    it('should call AuthService.login with correct credentials', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'testuser', role: 'user', id: 'user-id-123' },
        token: 'token',
        error: undefined
      });

      await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'testpass123' });

      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass123'
      });
    });

    it('should return token generated by AuthService', async () => {
      const expectedToken = 'unique-jwt-token-xyz789';

      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: expectedToken
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password123' });

      expect(response.body.token).toBe(expectedToken);
    });

    it('should return user information from AuthService', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: {
          username: 'john.doe',
          role: 'moderator',
          id: 'user-id-123'
        },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'john.doe', password: 'password123' });

      expect(response.body.user).toEqual({
        username: 'john.doe',
        role: 'moderator'
      });
    });

    it('should work with different user roles', async () => {
      const roles = ['admin', 'user', 'moderator', 'guest'];

      for (const role of roles) {
        jest.clearAllMocks();

        mockLogin.mockResolvedValue({
          success: true,
          user: { username: 'testuser', role, id: 'user-id-123' },
          token: 'token'
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({ username: 'testuser', password: 'password123' });

        expect(response.status).toBe(200);
        expect(response.body.user.role).toBe(role);
      }
    });

    it('should set correct content-type header', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password123' });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ==========================================================================
  // AUTENTICACIÓN FALLIDA
  // ==========================================================================

  describe('POST /api/auth/login - Failed Authentication', () => {
    it('should return 401 when AuthService returns failure', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Invalid credentials'
      });
    });

    it('should return error message from AuthService', async () => {
      const errorMessage = 'Account is locked';

      mockLogin.mockResolvedValue({
        success: false,
        error: errorMessage
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'locked-user', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe(errorMessage);
    });

    it('should handle different error messages from AuthService', async () => {
      const errorMessages = [
        'Invalid credentials',
        'User not found',
        'Account disabled',
        'Authentication failed'
      ];

      for (const errorMsg of errorMessages) {
        jest.clearAllMocks();

        mockLogin.mockResolvedValue({
          success: false,
          error: errorMsg
        });

        const response = await request(app)
          .post('/api/auth/login')
          .send({ username: 'user', password: 'password123' });

        expect(response.status).toBe(401);
        expect(response.body.error).toBe(errorMsg);
      }
    });

    it('should not include token in failure response', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'wrong' });

      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('user');
    });

    it('should not include user in failure response', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'wrong' });

      expect(response.body).not.toHaveProperty('user');
    });
  });

  // ==========================================================================
  // MIDDLEWARE DE BRUTE FORCE
  // ==========================================================================

  describe('Brute Force Protection', () => {
    it('should apply brute force detection middleware', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password123' });

      expect(mockBruteForceDetection).toHaveBeenCalled();
    });

    it('should call brute force middleware before validation', async () => {
      const callOrder: string[] = [];

      mockBruteForceDetection.mockImplementation((_req, _res, next) => {
        callOrder.push('bruteforce');
        next();
      });

      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password123' });

      expect(callOrder[0]).toBe('bruteforce');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle username with special characters', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user@example.com', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'user@example.com',
        password: 'password123'
      });
    });

    it('should handle very long username', async () => {
      const longUsername = 'a'.repeat(100);

      mockLogin.mockResolvedValue({
        success: true,
        user: { username: longUsername, role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: longUsername, password: 'password123' });

      expect(response.status).toBe(200);
    });

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(100);

      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: longPassword });

      expect(response.status).toBe(200);
    });

    it('should handle unicode characters in username', async () => {
      const unicodeUsername = "用户名";

      mockLogin.mockResolvedValue({
        success: true,
        user: { username: unicodeUsername, role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: unicodeUsername, password: 'password123' });

      expect(response.status).toBe(200);
    });

    it('should handle exactly 3 character username (boundary)', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'abc', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'abc', password: 'password123' });

      expect(response.status).toBe(200);
    });

    it('should handle exactly 6 character password (boundary)', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: '123456' });

      expect(response.status).toBe(200);
    });

    it('should handle null values in request body', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: null, password: null });

      expect(response.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should handle numeric values instead of strings', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 12345, password: 67890 });

      expect(response.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('should handle array values instead of strings', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: ['admin'], password: ['password'] });

      expect(response.status).toBe(400);
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // RESPONSE CONSISTENCY
  // ==========================================================================

  describe('Response Structure Consistency', () => {
    it('should return consistent success structure', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password123' });

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('role');
      expect(response.body).not.toHaveProperty('error');
      expect(response.body).not.toHaveProperty('success');
    });

    it('should return consistent error structure', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'wrong' });

      expect(response.body).toHaveProperty('error');
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('user');
      expect(response.body).not.toHaveProperty('success');
    });

    it('should return consistent validation error structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ab' });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('user');
    });

    it('should always return JSON content-type', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password123' });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  // ==========================================================================
  // SECURITY
  // ==========================================================================

  describe('Security', () => {
    it('should not expose password in any response', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'secret-password-123' });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('secret-password-123');
      expect(responseString).not.toContain('password');
    });

    it('should not expose internal error details', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'wrong' });

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('stackTrace');
    });

    it('should not include success field in response (implementation detail)', async () => {
      mockLogin.mockResolvedValue({
        success: true,
        user: { username: 'user', role: 'user', id: 'user-id-123' },
        token: 'token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'user', password: 'password123' });

      // El campo 'success' es interno del AuthService, no debe exponerse
      expect(response.body).not.toHaveProperty('success');
    });
  });

  // ==========================================================================
  // INTEGRATION FLOW
  // ==========================================================================

  describe('Complete Integration Flow', () => {
    it('should execute complete successful login flow', async () => {
      const credentials = {
        username: 'integration-test-user',
        password: 'integration-test-pass'
      };

      mockLogin.mockResolvedValue({
        success: true,
        user: {
          username: 'integration-test-user',
          role: 'admin',
          id: 'integration-test-user-id'
        },
        token: 'integration-test-token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      // Verificar respuesta
      expect(response.status).toBe(200);
      expect(response.body.token).toBe('integration-test-token');
      expect(response.body.user.username).toBe('integration-test-user');
      
      // Verificar que AuthService fue llamado correctamente
      expect(mockLogin).toHaveBeenCalledWith(credentials);
      
      // Verificar que brute force middleware se ejecutó
      expect(mockBruteForceDetection).toHaveBeenCalled();
    });

    it('should execute complete failed login flow', async () => {
      const credentials = {
        username: 'wrong-user',
        password: 'wrong-password'
      };

      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
      expect(mockLogin).toHaveBeenCalledWith(credentials);
    });
  });
});