import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response } from 'express';

const mockPublishEvent = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

jest.mock('../config/rabbitmq', () => ({
  getChannel: jest.fn().mockReturnValue({
    publish: jest.fn()
  }),
  publishEvent: mockPublishEvent
}));

jest.mock('../config/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}));


jest.mock('../services/threat.service', () => ({
  ThreatService: jest.fn().mockImplementation(() => ({
    reportThreat: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
  }))
}));


import { logger } from '../config/logger'; 
import { bruteForceDetection } from '../middlewares/bruteforce.middleware';

// ⚠️ HUMAN CHECK:
// La IA no estaba cubriendo la detección de fuerza bruta con tests.
// Agregamos pruebas para verificar el tracking de intentos, bloqueo temporal y reporte de amenazas.

describe('Brute Force Detection Middleware', () => {
  let app: express.Application;
   const TEST_IP = '192.168.1.100';

  beforeEach(() => {

    jest.clearAllMocks();
    mockPublishEvent.mockClear();

    app = express();
    app.use(express.json());

     app.use((req, _res, next) => {
      Object.defineProperty(req, 'ip', {
        value: TEST_IP,
        writable: true,
        configurable: true
      });
      next();
    });
    app.use(bruteForceDetection);
    
    app.post('/login', (req: Request, res: Response) => {
      const { username, password } = req.body;
      
      if (username === 'admin' && password === 'cyberguard2024') {
        return res.status(200).json({ token: 'fake-jwt-token' });
      }
      
      return res.status(401).json({ error: 'Invalid credentials' });
    });

    app.post('/other-endpoint', (req: Request, res: Response) => {
      res.status(401).json({ error: 'Unauthorized' });
    });
  });

  describe('Detección de intentos fallidos', () => {
    it('should track failed login attempts from same IP', async () => {
      const agent = request.agent(app);
      
      for (let i = 0; i < 3; i++) {
        const response = await agent
          .post('/login')
          .send({ username: 'admin', password: 'wrongpassword' });
        
        expect(response.status).toBe(401);
      }
      
      expect(mockPublishEvent).not.toHaveBeenCalled();
    });

    it('should report threat after 5 failed attempts', async () => {
      const agent = request.agent(app);
      
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/login')
          .send({ username: 'admin', password: 'wrongpassword' });
      }
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Brute force attack detected and reported',
        expect.objectContaining({
          attempts: 5,
          username: 'admin'
        })
      );
    });

    it('should not track 401 errors from non-login endpoints', async () => {
      const agent = request.agent(app);
      
      for (let i = 0; i < 10; i++) {
        await agent.post('/other-endpoint').send({});
      }
      
      expect(mockPublishEvent).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalledWith(
        'Brute force attack detected and reported',
        expect.any(Object)
      );
    });
  });

  describe('Bloqueo temporal de IPs', () => {
    it('should block requests from IP after 5 failed attempts', async () => {
      const agent = request.agent(app);
      
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/login')
          .send({ username: 'admin', password: 'wrongpassword' });
      }
      
      const blockedResponse = await agent
        .post('/login')
        .send({ username: 'admin', password: 'cyberguard2024' });
      
      expect(blockedResponse.status).toBe(403);
      expect(blockedResponse.body.error).toContain('Access denied');
      expect(logger.warn).toHaveBeenCalledWith(
        'Blocking request from blacklisted IP',
        expect.any(Object)
      );
    });

    it('should not allow valid login from blocked IP', async () => {
      const agent = request.agent(app);
      
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/login')
          .send({ username: 'admin', password: 'wrongpassword' });
      }
      
      const response = await agent
        .post('/login')
        .send({ username: 'admin', password: 'cyberguard2024' });
      
      expect(response.status).toBe(403);
      expect(response.body).not.toHaveProperty('token');
    });
  });

  describe('Ventana de tiempo', () => {
    it('should reset counter after time window expires', async () => {
      jest.useFakeTimers();
      const agent = request.agent(app);
      
      for (let i = 0; i < 3; i++) {
        await agent
          .post('/login')
          .send({ username: 'admin', password: 'wrongpassword' });
      }
      
      jest.advanceTimersByTime(6 * 60 * 1000);
      
      for (let i = 0; i < 3; i++) {
        await agent
          .post('/login')
          .send({ username: 'admin', password: 'wrongpassword' });
      }
      
      expect(logger.warn).not.toHaveBeenCalledWith(
        'Brute force attack detected and reported',
        expect.any(Object)
      );
      
      jest.useRealTimers();
    });
  });

  describe('Casos edge', () => {
    it('should handle missing username gracefully', async () => {
      const agent = request.agent(app);
      
      for (let i = 0; i < 5; i++) {
        await agent
          .post('/login')
          .send({ password: 'wrongpassword' });
      }
      
      expect(logger.warn).toHaveBeenCalledWith(
        "Blocking request from blacklisted IP",
        expect.objectContaining({
          ip: TEST_IP
        })
      );
    });

  });
});