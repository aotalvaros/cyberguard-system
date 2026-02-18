import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const mockConfig = {
  jwtSecret: 'test-jwt-secret-key-for-testing',
  port: 3000,
  rabbitmqUrl: 'amqp://mock:5672',
  adminUsername: 'admin',
  adminPassword: 'testpass123',
  allowedOrigins: ['http://localhost:4200'],
  nodeEnv: 'test'
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../../../../infrastructure/config/env', () => ({
  config: mockConfig
}));

jest.mock('../../../../../infrastructure/config/logger', () => ({
  logger: mockLogger
}));

import { authMiddleware, AuthRequest } from '../../../../../infrastructure/http/middlewares/auth.middleware';
import  '../../../../../infrastructure/config/logger';


describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRequest = {
      headers: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any
    };
    
    nextFunction = jest.fn() as NextFunction;
  });

  // ==========================================================================
  // VALIDACIÓN DE AUTHORIZATION HEADER
  // ==========================================================================

  describe('Authorization Header Validation', () => {
    it('should return 401 when Authorization header is missing', () => {
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authorization header missing' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is empty string', () => {
      mockRequest.headers = { authorization: '' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authorization header missing' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is empty after Bearer prefix', () => {
      mockRequest.headers = { authorization: 'Bearer ' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token missing' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header is only whitespace', () => {
      mockRequest.headers = { authorization: '   ' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should handle case-sensitive Bearer prefix', () => {
      mockRequest.headers = { authorization: 'bearer some-token' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      // Debería fallar porque 'bearer' (minúsculas) no es 'Bearer'
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  // ==========================================================================
  // VALIDACIÓN DE TOKEN
  // ==========================================================================

  describe('Token Validation', () => {
    it('should return 401 when token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token-here' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      const expiredToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '-1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token expired' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token signature is invalid', () => {
      const tokenWithWrongSignature = jwt.sign(
        { username: 'admin', role: 'admin' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${tokenWithWrongSignature}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when token is malformed', () => {
      mockRequest.headers = { authorization: 'Bearer not.a.valid.jwt' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should return 401 when token has invalid structure', () => {
      mockRequest.headers = { authorization: 'Bearer abc123' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });
  });

  // ==========================================================================
  // LOGGING
  // ==========================================================================

  describe('Logging', () => {
    it('should log warning when token is expired', () => {
      const expiredToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '-1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Expired token attempt',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('should log warning when token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Invalid token attempt',
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('should not log when token is valid', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AUTENTICACIÓN EXITOSA
  // ==========================================================================

  describe('Successful Authentication', () => {
    it('should call next() when token is valid', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should attach user to request when token is valid', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user).toEqual({
        username: 'admin',
        role: 'admin',
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
    });

    it('should preserve username and role from token', () => {
      const validToken = jwt.sign(
        { username: 'testuser', role: 'user' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.username).toBe('testuser');
      expect(mockRequest.user?.role).toBe('user');
    });

    it('should handle token without Bearer prefix', () => {
      const validToken = jwt.sign(
        { username: 'testuser', role: 'user' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: validToken };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockRequest.user?.username).toBe('testuser');
      expect(mockRequest.user?.role).toBe('user');
    });

    it('should handle token with extra spaces after Bearer', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer  ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      // Debería fallar porque hay espacio extra
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  // ==========================================================================
  // DIFERENTES TIPOS DE ROLES
  // ==========================================================================

  describe('Different User Roles', () => {
    it('should handle admin role', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.role).toBe('admin');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle user role', () => {
      const validToken = jwt.sign(
        { username: 'regularuser', role: 'user' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.role).toBe('user');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle custom roles', () => {
      const validToken = jwt.sign(
        { username: 'moderator', role: 'moderator' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.role).toBe('moderator');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle token with special characters in username', () => {
      const validToken = jwt.sign(
        { username: 'user@example.com', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.username).toBe('user@example.com');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle very long usernames', () => {
      const longUsername = 'a'.repeat(100);
      const validToken = jwt.sign(
        { username: longUsername, role: 'user' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.username).toBe(longUsername);
    });

    it('should handle token with additional claims', () => {
      const validToken = jwt.sign(
        { 
          username: 'admin', 
          role: 'admin',
          email: 'admin@example.com',
          permissions: ['read', 'write']
        },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user?.username).toBe('admin');
      expect(mockRequest.user?.role).toBe('admin');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle token about to expire (1 second left)', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1s' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user?.username).toBe('admin');
    });

    it('should handle token with very long expiration', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '365d' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

  });

  // ==========================================================================
  // TOKEN ESPECÍFICOS DE JWT
  // ==========================================================================

  describe('JWT Specific Behaviors', () => {
    it('should validate token iat (issued at) claim', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toHaveProperty('iat');
    });

    it('should validate token exp (expiration) claim', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockRequest.user).toHaveProperty('exp');
    });

    it('should reject token with nbf (not before) in the future', () => {
      const futureToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { 
          expiresIn: '1h',
          notBefore: '1h' // Token no es válido hasta dentro de 1 hora
        }
      );
      mockRequest.headers = { authorization: `Bearer ${futureToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ==========================================================================
  // MANEJO DE ERRORES INESPERADOS
  // ==========================================================================

  describe('Unexpected Error Handling', () => {
    it('should handle JWT library throwing unexpected error', () => {
      // Simular un error inesperado en jwt.verify
      const invalidToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
      mockRequest.headers = { authorization: invalidToken };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CONSISTENCIA DE RESPUESTAS
  // ==========================================================================

  describe('Response Consistency', () => {
    it('should return consistent error structure for missing header', () => {
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('should return consistent error structure for invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('should not call both next() and error response', () => {
      const validToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '1h' }
      );
      mockRequest.headers = { authorization: `Bearer ${validToken}` };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      // Si llama next(), no debería llamar status/json
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it('should not call next() when authentication fails', () => {
      mockRequest.headers = { authorization: 'Bearer invalid' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      // Si falla, no debería llamar next()
      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SEGURIDAD
  // ==========================================================================

  describe('Security', () => {
    it('should differentiate between expired and invalid tokens', () => {
      const expiredToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '-1h' }
      );
      
      const invalidToken = 'invalid-token';

      // Test expired
      mockRequest.headers = { authorization: `Bearer ${expiredToken}` };
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token expired' });

      jest.clearAllMocks();

      // Test invalid
      mockRequest.headers = { authorization: `Bearer ${invalidToken}` };
      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should not expose secret in any response', () => {
      mockRequest.headers = { authorization: 'Bearer invalid' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(jsonCall)).not.toContain(mockConfig.jwtSecret);
    });

    it('should not expose internal error details', () => {
      mockRequest.headers = { authorization: 'Bearer malformed' };

      authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('stack');
      expect(jsonCall).not.toHaveProperty('message');
    });
  });
});