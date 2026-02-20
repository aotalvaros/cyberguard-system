import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import express, { Request, Response } from 'express';
import request from 'supertest';


const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockReportThreat = jest.fn().mockResolvedValue('threat-id-123' as never);

const mockPublishEvent = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.mock('../../../../../infrastructure/config/rabbitmq', () => ({
  RabbitMQConnection: {
    getInstance: jest.fn(() => ({
      publishEvent: mockPublishEvent,
      connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    }))
  },
  publishEvent: mockPublishEvent,
  connectRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  closeRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

jest.mock('../../../../../infrastructure/config/logger', () => ({
  logger: mockLogger
}));

jest.mock('../../../../../application/services/threat.service', () => ({
  ThreatService: jest.fn().mockImplementation(() => ({
    reportThreat: mockReportThreat
  }))
}));


import  '../../../../../infrastructure/config/logger';
import { bruteForceDetection, resetBruteForceState } from '../../../../../infrastructure/http/middlewares/bruteforce.middleware';

describe('Brute Force Detection Middleware', () => {
  let app: express.Application;
  const TEST_IP = '192.168.1.100';

  const createTestApp = (customIp?: string) => {
    const testApp = express();
    testApp.use(express.json());
    
    // Inject test IP
    testApp.use((req, _res, next) => {
      Object.defineProperty(req, 'ip', {
        value: customIp || TEST_IP,
        writable: true,
        configurable: true
      });
      next();
    });
    
    testApp.use(bruteForceDetection);
    
    testApp.post('/login', (req: Request, res: Response) => {
      const { username, password } = req.body;
      if (username === 'admin' && password === 'correct') {
        return res.status(200).json({ token: 'fake-jwt-token' });
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    });
    
    // Endpoint adicional para testing
    testApp.get('/test', (_req: Request, res: Response) => {
      res.status(200).json({ message: 'test endpoint' });
    });
    
    return testApp;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetBruteForceState(); 
    mockReportThreat.mockResolvedValue('threat-id-123' as never);
    app = createTestApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetBruteForceState(); 
  });

  // ==========================================================================
  // TRACKING DE INTENTOS FALLIDOS
  // ==========================================================================

  describe('Failed Attempt Tracking', () => {
    it('should allow requests below threshold (less than 5 attempts)', async () => {
      // Hacer 4 intentos fallidos (debajo del umbral)
      for (let i = 0; i < 4; i++) {
        const response = await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
        expect(response.status).toBe(401);
      }
      
      // El quinto intento con credenciales correctas debería funcionar
      const finalResponse = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      
      expect(finalResponse.status).toBe(200);
      expect(finalResponse.body).toHaveProperty('token');
    });

    it('should track failed attempts per IP address', async () => {
      // Hacer 3 intentos fallidos
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      // No debería reportar amenaza aún (umbral es 5)
      expect(mockReportThreat).not.toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        'Brute force attack detected and reported',
        expect.any(Object)
      );
    });

    it('should only track failed login attempts (401 responses)', async () => {
      // Intentos exitosos no deberían contarse
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'correct' });
        expect(response.status).toBe(200);
      }
      
      // No debería reportar amenaza
      expect(mockReportThreat).not.toHaveBeenCalled();
    });

    it('should only track attempts on /login endpoint', async () => {
      // Múltiples requests a otro endpoint no deberían activar detección
      for (let i = 0; i < 10; i++) {
        await request(app).get('/test');
      }
      
      expect(mockReportThreat).not.toHaveBeenCalled();
    });

    it('should track attempts with username in metadata', async () => {
      // Hacer 5 intentos con username específico
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'testuser', password: 'wrong' });
      }
      
      // Verificar que se reportó con el username correcto
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            username: 'testuser'
          })
        })
      );
    });
  });

  // ==========================================================================
  // DETECCIÓN DE UMBRAL
  // ==========================================================================

  describe('Threshold Detection (5 attempts)', () => {
    it('should report threat after exactly 5 failed attempts', async () => {
      // Hacer exactamente 5 intentos fallidos
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      // Debería reportar amenaza
      expect(mockReportThreat).toHaveBeenCalledTimes(1);
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'intrusion',
          severity: 'high',
          sourceIp: TEST_IP,
          description: expect.stringContaining('Brute force attack detected')
        })
      );
    });

    it('should log warning when brute force is detected', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Brute force attack detected and reported',
        expect.objectContaining({
          ip: TEST_IP,
          attempts: 5
        })
      );
    });

    it('should include correct metadata in threat report', async () => {
      const username = 'targetuser';
      
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username, password: 'wrong' });
      }
      
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            attempts: 5,
            username,
            autoDetected: true,
            detectedAt: expect.any(String)
          })
        })
      );
    });

    it('should report threat only once per attack sequence', async () => {
      // Hacer 10 intentos fallidos
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      // Debería reportar solo una vez (en el intento 5)
      expect(mockReportThreat).toHaveBeenCalledTimes(1);
    });

    it('should block IP after 5 failed attempts', async () => {
      // Hacer 5 intentos para activar el bloqueo
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      // El siguiente intento (6to) debería ser bloqueado
      const blockedResponse = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      
      expect(blockedResponse.status).toBe(403);
      expect(blockedResponse.body.error).toContain('Access denied');
    });
  });

  // ==========================================================================
  // COMPORTAMIENTO DE IP BLOQUEADA
  // ==========================================================================

  describe('Blocked IP Behavior', () => {
    const blockIP = async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
    };

    it('should not allow valid credentials from blocked IP', async () => {
      await blockIP();
      
      // Intentar con credenciales correctas
      const response = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      
      expect(response.status).toBe(403);
      expect(response.body).not.toHaveProperty('token');
      expect(response.body.error).toContain('Access denied');
    });

    it('should log warning for blocked request attempts', async () => {
      await blockIP();
      jest.clearAllMocks();
      
      // Intentar desde IP bloqueada
      await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Blocking request from blacklisted IP',
        expect.objectContaining({ ip: TEST_IP })
      );
    });

    it('should block all subsequent requests from blocked IP', async () => {
      await blockIP();
      
      // Múltiples intentos adicionales
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'correct' });
        
        expect(response.status).toBe(403);
      }
    });

    it('should return consistent error message for blocked IPs', async () => {
      await blockIP();
      
      const response1 = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      
      const response2 = await request(app)
        .post('/login')
        .send({ username: 'different', password: 'different' });
      
      expect(response1.body.error).toBe(response2.body.error);
      expect(response1.status).toBe(403);
      expect(response2.status).toBe(403);
    });
  });

  // ==========================================================================
  // AISLAMIENTO POR IP
  // ==========================================================================

  describe('IP Isolation', () => {
    it('should track attempts separately for different IPs', async () => {
      // IP 1: 3 intentos
      const app1 = createTestApp('192.168.1.10');
      for (let i = 0; i < 3; i++) {
        await request(app1)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      // IP 2: 3 intentos
      const app2 = createTestApp('192.168.1.20');
      for (let i = 0; i < 3; i++) {
        await request(app2)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      // Ninguna debería estar bloqueada ni reportada
      expect(mockReportThreat).not.toHaveBeenCalled();
    });

    it('should block only the offending IP', async () => {
      // Bloquear IP1
      const app1 = createTestApp('192.168.1.10');
      for (let i = 0; i < 5; i++) {
        await request(app1)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      // IP1 debería estar bloqueada
      const response1 = await request(app1)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      expect(response1.status).toBe(403);
      
      // IP2 debería funcionar normalmente
      const app2 = createTestApp('192.168.1.20');
      const response2 = await request(app2)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      expect(response2.status).toBe(200);
    });
  });

  // ==========================================================================
  // VENTANA DE TIEMPO (5 minutos)
  // ==========================================================================

  describe('Time Window Behavior (5 minutes)', () => {
    it('should include time window info in description', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('5 minutes')
        })
      );
    });

    it('should keep IP blocked within time window', async () => {
      // Bloquear IP
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      // Debería seguir bloqueada
      const response = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      
      expect(response.status).toBe(403);
    });
  });

  // ==========================================================================
  // EDGE CASES Y MANEJO DE ERRORES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle requests without body', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app).post('/login');
        expect(response.status).toBe(401);
      }
      
      // Debería reportar amenaza incluso sin body
      expect(mockReportThreat).toHaveBeenCalled();
    });

    it('should handle missing username gracefully', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ password: 'wrong' });
      }
      
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            username: 'unknown'
          })
        })
      );
    });

    it('should handle missing password gracefully', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/login')
          .send({ username: 'admin' });
        expect(response.status).toBe(401);
      }
      
      expect(mockReportThreat).toHaveBeenCalled();
    });

    it('should handle empty request body', async () => {
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/login')
          .send({});
        expect(response.status).toBe(401);
      }
      
      expect(mockReportThreat).toHaveBeenCalled();
    });

    it('should handle very long username strings', async () => {
      const longUsername = 'a'.repeat(1000);
      
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: longUsername, password: 'wrong' });
      }
      
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            username: longUsername
          })
        })
      );
    });

    it('should handle special characters in username', async () => {
      const specialUsername = "admin';DROP TABLE users;--";
      
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: specialUsername, password: 'wrong' });
      }
      
      expect(mockReportThreat).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // INTEGRACIÓN CON RUTAS
  // ==========================================================================

  describe('Integration with Routes', () => {
    it('should work with multiple routes but only track /login', async () => {
      const multiRouteApp = express();
      multiRouteApp.use(express.json());
      
      multiRouteApp.use((req, _res, next) => {
        Object.defineProperty(req, 'ip', {
          value: TEST_IP,
          writable: true,
          configurable: true
        });
        next();
      });
      
      multiRouteApp.use(bruteForceDetection);
      
      multiRouteApp.post('/login', (_req: Request, res: Response) => {
        res.status(401).json({ error: 'Invalid' });
      });
      
      multiRouteApp.post('/api/auth/login', (_req: Request, res: Response) => {
        res.status(401).json({ error: 'Invalid' });
      });
      
      // Solo /login debería contar para brute force
      for (let i = 0; i < 5; i++) {
        await request(multiRouteApp).post('/login');
      }
      
      for (let i = 0; i < 5; i++) {
        await request(multiRouteApp).post('/api/auth/login');
      }
      
      // Solo debería reportar una vez (por /login)
      expect(mockReportThreat).toHaveBeenCalledTimes(1);
    });

    it('should not interfere with successful responses', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'correct' });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      }
      
      expect(mockReportThreat).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // PERFORMANCE
  // ==========================================================================

  describe('Performance', () => {
    it('should handle rapid successive requests', async () => {
      const requests = [];
      
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/login')
            .send({ username: 'admin', password: 'wrong' })
        );
      }
      
      await Promise.all(requests);
      
      // Debería manejar todas las peticiones
      expect(mockReportThreat).toHaveBeenCalled();
    });

    it('should handle mixed success and failure requests', async () => {
      for (let i = 0; i < 10; i++) {
        const password = i % 2 === 0 ? 'correct' : 'wrong';
        await request(app)
          .post('/login')
          .send({ username: 'admin', password });
      }
      
      // Solo contar los fallidos (5 en total)
      expect(mockReportThreat).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // RESPONSE CONSISTENCY
  // ==========================================================================

  describe('Response Consistency', () => {
    it('should return consistent JSON format for blocked requests', async () => {
      // Bloquear IP
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/login')
          .send({ username: 'admin', password: 'wrong' });
      }
      
      const response = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should not modify successful login responses', async () => {
      const response = await request(app)
        .post('/login')
        .send({ username: 'admin', password: 'correct' });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ token: 'fake-jwt-token' });
    });
  });
});