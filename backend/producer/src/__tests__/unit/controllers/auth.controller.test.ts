import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ============================================================================
// MOCKS - Configurados ANTES de las importaciones
// ============================================================================

const mockConfig = {
  jwtSecret: 'test-jwt-secret-key-for-testing',
  port: 3000,
  rabbitmqUrl: 'amqp://mock:5672',
  adminUsername: 'admin',
  adminPassword: 'cyberguard2024',
  allowedOrigins: ['http://localhost:4200'],
  nodeEnv: 'test'
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockBruteForceDetection = jest.fn((req: express.Request, res: express.Response, next: express.NextFunction) => next());

// Mock de módulos usando jest.mock en lugar de jest.unstable_mockModule
jest.mock('../../../config/env', () => ({
  config: mockConfig
}));

jest.mock('../../../config/logger', () => ({
  logger: mockLogger
}));

jest.mock('../../../middlewares/bruteforce.middleware', () => ({
  bruteForceDetection: mockBruteForceDetection
}));

jest.mock('../../../config/rabbitmq', () => ({
  publishEvent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getChannel: jest.fn().mockReturnValue(null),
  connectRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  closeRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

jest.mock('../../../services/threat.service', () => ({
  ThreatService: jest.fn().mockImplementation(() => ({
    createThreat: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'mock-threat-id' }),
    getThreat: jest.fn<() => Promise<null>>().mockResolvedValue(null),
    updateThreat: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
  }))
}));


import authRoutes from '../../../controllers/auth.controller';
import  '../../../config/logger';


describe('Auth Controller', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  
  describe('POST /api/auth/login - Input Validation', () => {
    it('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test123456' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('username');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('password');
    });

    it('should return 400 when both username and password are missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 when username is too short (less than 3 characters)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ab', password: 'test123456' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('3 characters');
    });

    it('should return 400 when password is too short (less than 6 characters)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: '12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('6 characters');
    });

    it('should return 400 when body is malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should return 400 when username is empty string', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'test123456' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when password is empty string', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: '' });

      expect(response.status).toBe(400);
    });
  });

  // ==========================================================================
  // AUTENTICACIÓN Y AUTORIZACIÓN
  // ==========================================================================
  
  describe('POST /api/auth/login - Authentication', () => {
    it('should return 401 for non-existent username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'cyberguard2024' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for invalid password with valid username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid password');
    });

    it('should return 401 for case-sensitive username mismatch', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'Admin', password: 'cyberguard2024' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for case-sensitive password mismatch', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'CYBERGUARD2024' });

      expect(response.status).toBe(401);
    });

    it('should return 200 with token for valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);
    });

    it('should return correct user information on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        username: 'admin',
        role: 'admin'
      });
    });
  });

  // ==========================================================================
  // VALIDACIÓN DE TOKEN JWT
  // ==========================================================================
  
  describe('POST /api/auth/login - JWT Token Validation', () => {
    it('should return a valid JWT token structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      expect(response.status).toBe(200);
      const token = response.body.token;
      const parts = token.split('.');
      
      expect(parts.length).toBe(3);
    });

    it('should create token with correct payload', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      const token = response.body.token;
      const decoded = jwt.decode(token) as any;
      
      expect(decoded).toHaveProperty('username', 'admin');
      expect(decoded).toHaveProperty('role', 'admin');
      expect(decoded).toHaveProperty('exp');
      expect(decoded).toHaveProperty('iat');
    });

    it('should create token that can be verified with correct secret', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      const token = response.body.token;
      
      expect(() => {
        jwt.verify(token, mockConfig.jwtSecret);
      }).not.toThrow();
    });

    it('should create token with 8 hour expiration', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      const token = response.body.token;
      const decoded = jwt.decode(token) as any;
      
      const expirationTime = decoded.exp - decoded.iat;
      const eightHoursInSeconds = 8 * 60 * 60;
      
      expect(expirationTime).toBe(eightHoursInSeconds);
    });

  });


  describe('POST /api/auth/login - Logging', () => {
    it('should log failed login attempt when user not found', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'password123' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed login attempt - user not found',
        expect.objectContaining({ username: 'wronguser' })
      );
    });

    it('should log failed login attempt when password is incorrect', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed login attempt - invalid password',
        expect.objectContaining({ username: 'admin' })
      );
    });

    it('should log successful login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User logged in',
        expect.objectContaining({ username: 'admin' })
      );
    });

    it('should log exactly once for failed user attempt', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'password123' });

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log exactly once for failed password attempt', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log exactly once for successful login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should not log password in any log entry', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      const allLogCalls = [
        ...mockLogger.info.mock.calls,
        ...mockLogger.warn.mock.calls,
        ...mockLogger.error.mock.calls
      ];

      allLogCalls.forEach(call => {
        const logString = JSON.stringify(call);
        expect(logString).not.toContain('cyberguard2024');
      });
    });
  });

  // ==========================================================================
  // SEGURIDAD
  // ==========================================================================
  
  describe('POST /api/auth/login - Security', () => {
    it('should not expose password in successful response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('cyberguard2024');
      expect(responseString).not.toContain('password');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should not expose password in error response', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('wrongpassword');
      expect(responseString).not.toContain('cyberguard2024');
    });

    it('should not expose internal error details or stack traces', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrong' });

      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('stackTrace');
      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain('.ts:');
    });

    it('should return generic error message for wrong username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'cyberguard2024' });

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should use different error messages internally', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'wronguser', password: 'cyberguard2024' });

      const wrongUserCall = mockLogger.warn.mock.calls[0];

      jest.clearAllMocks();

      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });

      const wrongPasswordCall = mockLogger.warn.mock.calls[0];

      expect(wrongUserCall[0]).not.toBe(wrongPasswordCall[0]);
    });

    it('should not expose JWT secret', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      const responseString = JSON.stringify(response.body);
      expect(responseString).not.toContain(mockConfig.jwtSecret);
    });

    it('should set proper content-type header', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should handle SQL injection attempt', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: "admin' OR '1'='1", password: 'cyberguard2024' });

      expect(response.status).toBe(401);
    });

    it('should handle XSS attempt', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: '<script>alert("xss")</script>', password: 'password123456' });

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // MIDDLEWARE
  // ==========================================================================
  
  describe('POST /api/auth/login - Brute Force Protection', () => {
    it('should apply brute force detection middleware', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      expect(mockBruteForceDetection).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================
  
  describe('POST /api/auth/login - Edge Cases', () => {
    it('should handle username with trailing spaces', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin ', password: 'cyberguard2024' });

      expect(response.status).toBe(401);
    });

    it('should handle very long username', async () => {
      const longUsername = 'a'.repeat(1000);
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: longUsername, password: 'cyberguard2024' });

      expect(response.status).toBe(401);
    });

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(1000);
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: longPassword });

      expect(response.status).toBe(401);
    });

    it('should handle null values', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: null, password: null });

      expect(response.status).toBe(400);
    });

    it('should handle numeric values', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 12345, password: 67890 });

      expect(response.status).toBe(400);
    });

    it('should handle array values', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: ['admin'], password: ['cyberguard2024'] });

      expect(response.status).toBe(400);
    });
  });

  // ==========================================================================
  // CONSISTENCIA
  // ==========================================================================
  
  describe('POST /api/auth/login - Response Consistency', () => {
    it('should return consistent error structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'ab' });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should return consistent success structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'cyberguard2024' });

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('role');
    });
  });
});