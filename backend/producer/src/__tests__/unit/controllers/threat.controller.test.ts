import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
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

const mockCreateThreat = jest.fn();
const mockReportThreat = jest.fn();

const mockThreatStore = {
  add: jest.fn(),
  getAll: jest.fn().mockReturnValue([]),
  count: jest.fn().mockReturnValue(0)
};

// Configurar mocks usando jest.mock
jest.mock('../../../config/env', () => ({
  config: mockConfig
}));

jest.mock('../../../config/logger', () => ({
  logger: mockLogger
}));

jest.mock('../../../config/rabbitmq', () => ({
  publishEvent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getChannel: jest.fn().mockReturnValue(null),
  connectRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  closeRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

jest.mock('../../../services/threat.service', () => ({
  ThreatService: jest.fn().mockImplementation(() => ({
    createThreat: mockCreateThreat,
    reportThreat: mockReportThreat
  }))
}));

jest.mock('../../../services/threat.store', () => ({
  threatStore: mockThreatStore
}));

import threatRoutes from '../../../controllers/threat.controller';
import { logger } from '../../../config/logger';


describe('Threat Controller', () => {
  let app: express.Application;
  let validToken: string;

  beforeAll(() => {
    validToken = jwt.sign(
      { username: 'admin', role: 'admin' },
      mockConfig.jwtSecret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock default responses
    mockReportThreat.mockResolvedValue('test-threat-id-12345' as never);
    mockThreatStore.getAll.mockReturnValue([]);
    mockThreatStore.count.mockReturnValue(0);

    // Setup express app
    app = express();
    app.use(express.json());
    app.use('/api/threats', threatRoutes);
  });

  // ==========================================================================
  // AUTENTICACIÓN
  // ==========================================================================

  describe('POST /api/threats - Authentication', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post('/api/threats')
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test malware threat'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', 'Bearer invalid-token-here')
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test malware threat'
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', 'InvalidFormat token')
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test malware threat'
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        mockConfig.jwtSecret,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test malware threat'
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 with token signed with wrong secret', async () => {
      const wrongToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${wrongToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test malware threat'
        });

      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // VALIDACIÓN DE ENTRADA
  // ==========================================================================

  describe('POST /api/threats - Validation', () => {
    it('should return 400 for invalid threat type', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'invalid-type',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat description here'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('type');
    });

    it('should return 400 for invalid severity level', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'invalid-severity',
          sourceIp: '192.168.1.100',
          description: 'Test threat description here'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('severity');
    });

    it('should return 400 for invalid sourceIp format', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: 'not-an-ip-address',
          description: 'Test threat description here'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('ip');
    });

    it('should return 400 for invalid targetIp format', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          targetIp: 'invalid-ip',
          description: 'Test threat description here'
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when description is too short', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Short'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('10');
    });

    it('should return 400 when description is too long', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'A'.repeat(501)
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('500');
    });

    it('should return 400 when type is missing', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat description'
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when severity is missing', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          sourceIp: '192.168.1.100',
          description: 'Test threat description'
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when sourceIp is missing', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          description: 'Test threat description'
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 when description is missing', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100'
        });

      expect(response.status).toBe(400);
    });

    it('should validate all threat types', async () => {
      const validTypes = ['malware', 'intrusion', 'phishing', 'ddos', 'ransomware'];
      
      for (const type of validTypes) {
        const response = await request(app)
          .post('/api/threats')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            type,
            severity: 'high',
            sourceIp: '192.168.1.100',
            description: 'Valid threat description for testing'
          });

        expect(response.status).toBe(202);
      }
    });

    it('should validate all severity levels', async () => {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      
      for (const severity of validSeverities) {
        const response = await request(app)
          .post('/api/threats')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            type: 'malware',
            severity,
            sourceIp: '192.168.1.100',
            description: 'Valid threat description for testing'
          });

        expect(response.status).toBe(202);
      }
    });
  });

  // ==========================================================================
  // FORMATOS DE IP VÁLIDOS
  // ==========================================================================

  describe('POST /api/threats - IP Address Formats', () => {
    it('should accept valid IPv4 address', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat with valid IPv4'
        });

      expect(response.status).toBe(202);
    });

    it('should accept valid IPv6 address', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          description: 'Test threat with valid IPv6'
        });

      expect(response.status).toBe(202);
    });

    it('should accept localhost IP', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '127.0.0.1',
          description: 'Test threat from localhost'
        });

      expect(response.status).toBe(202);
    });

    it('should accept private network IP', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'intrusion',
          severity: 'high',
          sourceIp: '10.0.0.1',
          description: 'Test threat from private network'
        });

      expect(response.status).toBe(202);
    });
  });

  // ==========================================================================
  // CASOS DE ÉXITO
  // ==========================================================================

  describe('POST /api/threats - Success Cases', () => {
    it('should return 202 with valid threat data', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'critical',
          sourceIp: '192.168.1.100',
          description: 'Critical malware detected in system'
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('message', 'Threat reported successfully');
      expect(response.body).toHaveProperty('threatId');
      expect(response.body).toHaveProperty('status', 'processing');
    });

    it('should call reportThreat with correct data', async () => {
      const threatData = {
        type: 'intrusion',
        severity: 'high',
        sourceIp: '10.0.0.1',
        description: 'Intrusion attempt detected on server'
      };

      await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send(threatData);

      expect(mockReportThreat).toHaveBeenCalledTimes(1);
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'intrusion',
          severity: 'high',
          sourceIp: '10.0.0.1',
          description: 'Intrusion attempt detected on server'
        })
      );
    });

    it('should accept optional targetIp', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'ddos',
          severity: 'critical',
          sourceIp: '192.168.1.100',
          targetIp: '10.0.0.1',
          description: 'DDoS attack targeting server'
        });

      expect(response.status).toBe(202);
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({
          targetIp: '10.0.0.1'
        })
      );
    });

    it('should accept optional metadata', async () => {
      const metadata = { 
        hash: 'abc123def456', 
        filename: 'malware.exe',
        size: 1024
      };

      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'ransomware',
          severity: 'critical',
          sourceIp: '192.168.1.100',
          description: 'Ransomware encryption detected',
          metadata
        });

      expect(response.status).toBe(202);
      expect(mockReportThreat).toHaveBeenCalledWith(
        expect.objectContaining({ metadata })
      );
    });

    it('should return threatId from service', async () => {
      mockReportThreat.mockResolvedValue('threat-xyz-789' as never);

      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'phishing',
          severity: 'medium',
          sourceIp: '192.168.1.50',
          description: 'Phishing attempt detected via email'
        });

      expect(response.body.threatId).toBe('threat-xyz-789');
    });
  });

  // ==========================================================================
  // LOGGING
  // ==========================================================================

  describe('POST /api/threats - Logging', () => {
    it('should log threat report with correct info', async () => {
      await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Malware detected on endpoint'
        });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Threat endpoint called',
        expect.objectContaining({
          threatId: expect.any(String),
          user: 'admin',
          type: 'malware'
        })
      );
    });

    it('should log errors when service fails', async () => {
      mockReportThreat.mockRejectedValue(new Error('Service failure') as never);

      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat description'
        });

      expect(response.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error reporting threat',
        expect.objectContaining({
          error: 'Service failure'
        })
      );
    });
  });

  // ==========================================================================
  // MANEJO DE ERRORES
  // ==========================================================================

  describe('POST /api/threats - Error Handling', () => {
    it('should return 500 when service throws error', async () => {
      mockReportThreat.mockRejectedValue(new Error('Database error') as never);

      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat description'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should not expose internal error details', async () => {
      mockReportThreat.mockRejectedValue(new Error('Detailed database connection error') as never);

      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat description'
        });

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.error).not.toContain('database');
      expect(response.body).not.toHaveProperty('stack');
    });
  });

  // ==========================================================================
  // GET /api/threats
  // ==========================================================================

  describe('GET /api/threats - Authentication', () => {
    it('should return 401 when no token provided', async () => {
      const response = await request(app).get('/api/threats');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/threats')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/threats - Success Cases', () => {
    it('should return 200 with threats list', async () => {
      const mockThreats = [
        {
          eventId: 'event-1',
          eventType: 'threat.detected',
          timestamp: new Date().toISOString(),
          data: { 
            type: 'malware', 
            severity: 'high',
            sourceIp: '192.168.1.100',
            description: 'Test malware'
          }
        }
      ];

      mockThreatStore.getAll.mockReturnValue(mockThreats);

      const response = await request(app)
        .get('/api/threats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('threats');
      expect(response.body).toHaveProperty('total', 1);
      expect(Array.isArray(response.body.threats)).toBe(true);
      expect(response.body.threats).toEqual(mockThreats);
    });

    it('should return empty array when no threats exist', async () => {
      mockThreatStore.getAll.mockReturnValue([]);

      const response = await request(app)
        .get('/api/threats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.threats).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should return multiple threats', async () => {
      const mockThreats = [
        { eventId: 'e1', data: { type: 'malware' } },
        { eventId: 'e2', data: { type: 'intrusion' } },
        { eventId: 'e3', data: { type: 'phishing' } }
      ];

      mockThreatStore.getAll.mockReturnValue(mockThreats);

      const response = await request(app)
        .get('/api/threats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
      expect(response.body.threats).toHaveLength(3);
    });
  });

  describe('GET /api/threats - Logging', () => {
    it('should log list requests with user info', async () => {
      mockThreatStore.getAll.mockReturnValue([{ eventId: 'e1' }]);

      await request(app)
        .get('/api/threats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Threats list requested',
        expect.objectContaining({
          user: 'admin',
          count: 1
        })
      );
    });

    it('should log when empty list is returned', async () => {
      mockThreatStore.getAll.mockReturnValue([]);

      await request(app)
        .get('/api/threats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Threats list requested',
        expect.objectContaining({
          user: 'admin',
          count: 0
        })
      );
    });
  });

  describe('GET /api/threats - Error Handling', () => {
    it('should return 500 when store throws error', async () => {
      mockThreatStore.getAll.mockImplementation(() => {
        throw new Error('Store connection failed');
      });

      const response = await request(app)
        .get('/api/threats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should log errors when fetching threats fails', async () => {
      mockThreatStore.getAll.mockImplementation(() => {
        throw new Error('Database error');
      });

      await request(app)
        .get('/api/threats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching threats',
        expect.objectContaining({
          error: 'Database error'
        })
      );
    });

    it('should not expose internal error details', async () => {
      mockThreatStore.getAll.mockImplementation(() => {
        throw new Error('Detailed internal database error');
      });

      const response = await request(app)
        .get('/api/threats')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body.error).not.toContain('database');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('POST /api/threats - Edge Cases', () => {
    it('should handle description with special characters', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Malware with special chars: !@#$%^&*()'
        });

      expect(response.status).toBe(202);
    });

    it('should handle description with unicode characters', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Malware detectado: ataque sofisticado 日本語'
        });

      expect(response.status).toBe(202);
    });

    it('should handle exactly 10 character description', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: '1234567890'
        });

      expect(response.status).toBe(202);
    });

    it('should handle exactly 500 character description', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'A'.repeat(500)
        });

      expect(response.status).toBe(202);
    });

    it('should handle empty metadata object', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat with empty metadata',
          metadata: {}
        });

      expect(response.status).toBe(202);
    });

    it('should handle complex nested metadata', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat with complex metadata',
          metadata: {
            file: {
              name: 'malware.exe',
              hash: 'abc123',
              size: 1024
            },
            process: {
              pid: 1234,
              name: 'explorer.exe'
            }
          }
        });

      expect(response.status).toBe(202);
    });
  });

  // ==========================================================================
  // RESPONSE CONSISTENCY
  // ==========================================================================

  describe('Response Structure Consistency', () => {
    it('should return consistent error structure', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'invalid-type',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test description'
        });

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
      expect(response.body).not.toHaveProperty('message');
      expect(response.body).not.toHaveProperty('threatId');
    });

    it('should return consistent success structure', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Valid threat report'
        });

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('threatId');
      expect(response.body).toHaveProperty('status');
      expect(response.body).not.toHaveProperty('error');
    });

    it('should always return JSON content-type', async () => {
      const response = await request(app)
        .post('/api/threats')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat'
        });

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});