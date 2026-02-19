import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

// ==========================================================================
// MOCKS
// ==========================================================================

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockReportThreat = jest.fn();
const mockThreatService = {
  reportThreat: mockReportThreat
};

const mockExecuteListThreats = jest.fn();
const mockListThreatsUseCase = {
  execute: mockExecuteListThreats
};

const mockExecuteDeleteThreat = jest.fn();
const mockDeleteThreatUseCase = {
  execute: mockExecuteDeleteThreat
};

const mockGetThreatService = jest.fn(() => mockThreatService);
const mockGetListThreatsUseCase = jest.fn(() => mockListThreatsUseCase);
const mockGetDeleteThreatUseCase = jest.fn(() => mockDeleteThreatUseCase);

jest.mock('../../../../../infrastructure/config/logger', () => ({
  logger: mockLogger
}));

jest.mock('../../../../../infrastructure/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getThreatService: mockGetThreatService,
    getListThreatsUseCase: mockGetListThreatsUseCase,
    getDeleteThreatUseCase: mockGetDeleteThreatUseCase
  }
}));

jest.mock('../../../../../infrastructure/http/middlewares/auth.middleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => next()
}));

jest.mock('../../../../../infrastructure/http/middlewares/bruteforce.middleware', () => ({
  bruteForceDetection: (req: any, res: any, next: any) => next()
}));

import threatRouter from '../../../../../infrastructure/http/controllers/threat.controller';
import { ThreatNotFoundException } from '../../../../../domain/exceptions/ThreatNotFoundException';


describe('Threat Con as nevertroller', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/threats', threatRouter);
  });

  // ==========================================================================
  // POST / - REPORTE DE AMENAZAS
  // ==========================================================================

  describe('POST /threats - Report Threat', () => {
    describe('Successful Threat Reporting', () => {
      it('should return 201 when threat is reported successfully', async () => {
        const expectedThreatId = 'threat-id-123';
        mockReportThreat.mockResolvedValue( expectedThreatId as never);

        const response = await request(app)
          .post('/threats')
          .send({
            type: 'malware',
            severity: 'high',
            sourceIp: '192.168.1.100',
            description: 'Malware detected'
          });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          success: true,
          threatId: expectedThreatId,
          message: 'Threat reported successfully'
        });
      });

      it('should call ServiceFactory.getThreatService', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);

        await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(mockGetThreatService).toHaveBeenCalled();
      });

      it('should call threatService.reportThreat with request body', async () => {
        const threatData = {
          type: 'intrusion',
          severity: 'critical',
          sourceIp: '10.0.0.1',
          description: 'Intrusion attempt detected'
        };

        mockReportThreat.mockResolvedValue('threat-id' as never);

        await request(app)
          .post('/threats')
          .send(threatData);

        expect(mockReportThreat).toHaveBeenCalledWith(threatData);
      });

      it('should log success with threatId', async () => {
        const threatId = 'threat-xyz-789';
        mockReportThreat.mockResolvedValue(threatId as never);

        await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Threat reported successfully',
          { threatId }
        );
      });

      it('should include all required fields in success response', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);

        const response = await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('threatId') as never;
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('Different Threat Types', () => {
      const threatTypes = ['malware', 'intrusion', 'phishing', 'ddos', 'ransomware'];

      threatTypes.forEach(type => {
        it(`should handle ${type} threat type`, async () => {
          mockReportThreat.mockResolvedValue('threat-id' as never);

          const response = await request(app)
            .post('/threats')
            .send({
              type,
              severity: 'high',
              sourceIp: '192.168.1.100',
              description: `${type} detected`
            });

          expect(response.status).toBe(201);
          expect(mockReportThreat).toHaveBeenCalledWith(
            expect.objectContaining({ type })
          );
        });
      });
    });

    describe('Different Severity Levels', () => {
      const severityLevels = ['low', 'medium', 'high', 'critical'];

      severityLevels.forEach(severity => {
        it(`should handle ${severity} severity level`, async () => {
          mockReportThreat.mockResolvedValue('threat-id' as never);

          const response = await request(app)
            .post('/threats')
            .send({
              type: 'malware',
              severity,
              sourceIp: '192.168.1.100',
              description: 'Test threat'
            });

          expect(response.status).toBe(201);
        });
      });
    });

    describe('Optional Fields in POST', () => {
      it('should handle threat with targetIp', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);

        await request(app)
          .post('/threats')
          .send({
            type: 'ddos',
            severity: 'critical',
            sourceIp: '192.168.1.100',
            targetIp: '10.0.0.1',
            description: 'DDoS attack'
          });

        expect(mockReportThreat).toHaveBeenCalledWith(
          expect.objectContaining({ targetIp: '10.0.0.1' })
        );
      });

      it('should handle threat with metadata', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);

        const metadata = { hash: 'abc123', filename: 'malware.exe' };

        await request(app)
          .post('/threats')
          .send({
            type: 'malware',
            severity: 'high',
            sourceIp: '192.168.1.100',
            metadata
          });

        expect(mockReportThreat).toHaveBeenCalledWith(
          expect.objectContaining({ metadata })
        );
      });
    });

    describe('POST Error Handling', () => {
      it('should return 500 when service throws error', async () => {
        mockReportThreat.mockRejectedValue(new Error('Service error') as never);

        const response = await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Failed to report threat'
        });
      });

      it('should log error when reportThreat fails', async () => {
        const error = new Error('Database error');
        mockReportThreat.mockRejectedValue(error as never);

        await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to report threat',
          { error: error.message }
        );
      });

      it('should not expose internal error details', async () => {
        mockReportThreat.mockRejectedValue(
          new Error('Sensitive database error with SQL details') as never
        );

        const response = await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(response.body.error).toBe('Failed to report threat');
        expect(response.body.error).not.toContain('SQL');
      });

      it('should handle non-Error exceptions', async () => {
        mockReportThreat.mockRejectedValue('String error' as never);

        const response = await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(response.status).toBe(500);
      });
    });

    describe('POST Response Structure', () => {
      it('should not include error field in success response', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);

        const response = await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(response.body).not.toHaveProperty('error');
      });

      it('should not include threatId in error response', async () => {
        mockReportThreat.mockRejectedValue(new Error('Failed') as never);

        const response = await request(app)
          .post('/threats')
          .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

        expect(response.body).not.toHaveProperty('threatId') as never;
      });
    });

    describe('POST Edge Cases', () => {
      it('should handle empty request body', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);

        const response = await request(app)
          .post('/threats')
          .send({});

        expect(response.status).toBe(201);
        expect(mockReportThreat).toHaveBeenCalledWith({});
      });

      it('should handle very long description', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);
        const longDescription = 'A'.repeat(5000);

        const response = await request(app)
          .post('/threats')
          .send({
            type: 'malware',
            severity: 'high',
            sourceIp: '192.168.1.100',
            description: longDescription
          });

        expect(response.status).toBe(201);
      });

      it('should handle special characters in data', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);

        const response = await request(app)
          .post('/threats')
          .send({
            type: 'malware',
            severity: 'high',
            sourceIp: '192.168.1.100',
            description: 'Threat with special chars: !@#$%^&*()'
          });

        expect(response.status).toBe(201);
      });

      it('should handle unicode characters', async () => {
        mockReportThreat.mockResolvedValue('threat-id' as never);

        const response = await request(app)
          .post('/threats')
          .send({
            type: 'malware',
            severity: 'high',
            sourceIp: '192.168.1.100',
            description: 'Threat detected: 日本語 中文 한글'
          });

        expect(response.status).toBe(201);
      });
    });
  });

  // ==========================================================================
  // GET / - LISTAR AMENAZAS
  // ==========================================================================

  describe('GET /threats - List Threats', () => {
    describe('Successful Threat Listing', () => {
      it('should return 200 with threats when listing is successful', async () => {
        const mockResult = {
          total: 3,
          threats: [
            { id: 'threat-1', type: 'malware', severity: 'high' },
            { id: 'threat-2', type: 'phishing', severity: 'medium' },
            { id: 'threat-3', type: 'ddos', severity: 'critical' }
          ]
        };

        mockExecuteListThreats.mockResolvedValue( mockResult as never);

        const response = await request(app)
          .get('/threats');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockResult);
      });

      it('should call ServiceFactory.getListThreatsUseCase', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 0, threats: [] } as never);

        await request(app).get('/threats');

        expect(mockGetListThreatsUseCase).toHaveBeenCalled();
      });

      it('should call execute on ListThreatsUseCase', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 1, threats: [] } as never);

        await request(app).get('/threats');

        expect(mockExecuteListThreats).toHaveBeenCalledWith();
      });

      it('should log threats retrieval with total count', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 5, threats: [] } as never);

        await request(app).get('/threats');

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Threats retrieved',
          { total: 5 }
        );
      });

      it('should include total property in response', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 10, threats: [] } as never);

        const response = await request(app).get('/threats');

        expect(response.body).toHaveProperty('total', 10 as never);
      });

      it('should include threats array in response', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 2, threats: [] } as never);

        const response = await request(app).get('/threats');

        expect(response.body).toHaveProperty('threats'); 
        expect(Array.isArray(response.body.threats)).toBe(true);
      });
    });

    describe('Empty Threat List', () => {
      it('should return 200 with empty list when no threats exist', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 0, threats: [] } as never);

        const response = await request(app).get('/threats');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ total: 0, threats: [] } as never);
      });
    });

    describe('Multiple Threat Types in List', () => {
      it('should return list with mixed threat types', async () => {
        const threats = [
          { id: 't1', type: 'malware' },
          { id: 't2', type: 'intrusion' },
          { id: 't3', type: 'phishing' },
          { id: 't4', type: 'ddos' },
          { id: 't5', type: 'ransomware' }
        ];

        mockExecuteListThreats.mockResolvedValue({ total: 5, threats } as never as never);

        const response = await request(app).get('/threats');

        expect(response.body.threats.length).toBe(5);
        expect(response.body.total).toBe(5);
      });

      it('should include all threat types', async () => {
        const threats = [
          { id: 't1', type: 'malware' },
          { id: 't2', type: 'intrusion' },
          { id: 't3', type: 'phishing' }
        ];

        mockExecuteListThreats.mockResolvedValue({ total: 3, threats } as never as never);

        const response = await request(app).get('/threats');

        const types = response.body.threats.map((t: any) => t.type);
        expect(types).toContain('malware');
        expect(types).toContain('intrusion');
        expect(types).toContain('phishing');
      });
    });

    describe('GET Error Handling', () => {
      it('should return 500 when useCase throws error', async () => {
        mockExecuteListThreats.mockRejectedValue(new Error('Database error') as never);

        const response = await request(app).get('/threats');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Failed to retrieve threats'
        });
      });

      it('should log error when listing fails', async () => {
        const error = new Error('Connection refused');
        mockExecuteListThreats.mockRejectedValue(error as never);

        await request(app).get('/threats');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to list threats',
          { error: error.message }
        );
      });

      it('should not expose internal error details', async () => {
        mockExecuteListThreats.mockRejectedValue(
          new Error('SQL: SELECT * FROM sensitive_table') as never
        );

        const response = await request(app).get('/threats');

        expect(response.body.error).toBe('Failed to retrieve threats');
        expect(response.body.error).not.toContain('SQL');
      });

      it('should handle non-Error exceptions', async () => {
        mockExecuteListThreats.mockRejectedValue('String error' as never);

        const response = await request(app).get('/threats');

        expect(response.status).toBe(500);
      });
    });

    describe('GET Response Structure', () => {
      it('should return consistent structure', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 5, threats: [] } as never);

        const response = await request(app).get('/threats');

        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('threats'); 
      });

      it('should not include error field in success response', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 5, threats: [] } as never);

        const response = await request(app).get('/threats');

        expect(response.body).not.toHaveProperty('error');
      });

      it('should return total as number', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 10, threats: [] } as never);

        const response = await request(app).get('/threats');

        expect(typeof response.body.total).toBe('number');
      });

      it('should return threats as array', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 1, threats: [] } as never);

        const response = await request(app).get('/threats');

        expect(Array.isArray(response.body.threats)).toBe(true);
      });
    });

    describe('Large Dataset Handling', () => {
      it('should handle list with 1000 threats', async () => {
        const threats = Array(1000).fill(null).map((_, i) => ({
          id: `threat-${i}`,
          type: 'malware'
        }));

        mockExecuteListThreats.mockResolvedValue({ total: 1000, threats } as never);

        const response = await request(app).get('/threats');

        expect(response.body.threats.length).toBe(1000);
        expect(response.body.total).toBe(1000);
      });

      it('should handle threats with complex metadata', async () => {
        const threats = [
          {
            id: 'threat-1',
            type: 'malware',
            metadata: {
              file: { name: 'test.exe', hash: 'abc123', size: 2048 },
              process: { pid: 9876, name: 'svc.exe' }
            }
          }
        ];

        mockExecuteListThreats.mockResolvedValue({ total: 1, threats } as never);

        const response = await request(app).get('/threats');

        expect(response.body.threats[0].metadata).toBeDefined();
        expect(response.body.threats[0].metadata.file).toBeDefined();
      });
    });

    describe('GET Edge Cases', () => {
      it('should handle threats with empty fields', async () => {
        mockExecuteListThreats.mockResolvedValue({
          total: 1,
          threats: [{ id: 'threat-1', description: '' }]
        } as never);

        const response = await request(app).get('/threats');

        expect(response.body.threats[0].description).toBe('');
      });

      it('should handle threats with null values', async () => {
        mockExecuteListThreats.mockResolvedValue({
          total: 1,
          threats: [{ id: 'threat-1', metadata: null }]
        } as never);

        const response = await request(app).get('/threats');

        expect(response.body.threats[0].metadata).toBeNull();
      });

      it('should handle unicode in threat data', async () => {
        mockExecuteListThreats.mockResolvedValue({
          total: 1,
          threats: [{ id: 'threat-1', description: '日本語 中文' }]
        } as never);

        const response = await request(app).get('/threats');

        expect(response.body.threats[0].description).toContain('日本語');
      });

      it('should handle total mismatch with array length', async () => {
        mockExecuteListThreats.mockResolvedValue({
          total: 100,
          threats: [{ id: 'threat-1' }]
        } as never);

        const response = await request(app).get('/threats');

        expect(response.body.total).toBe(100);
        expect(response.body.threats.length).toBe(1);
      });
    });

    describe('GET Performance', () => {
      it('should handle request quickly', async () => {
        mockExecuteListThreats.mockResolvedValue({ total: 100, threats: [] } as never);

        const start = Date.now();
        await request(app).get('/threats');
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(1000);
      });
    });
  });

  // ==========================================================================
  // LOGGING - AMBOS ENDPOINTS
  // ==========================================================================

  describe('Logging - Both Endpoints', () => {
    it('should log only success on successful POST', async () => {
      mockReportThreat.mockResolvedValue('threat-id' as never);

      await request(app)
        .post('/threats')
        .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log only success on successful GET', async () => {
      mockExecuteListThreats.mockResolvedValue({ total: 5, threats: [] } as never);

      await request(app).get('/threats');

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log only error on failed POST', async () => {
      mockReportThreat.mockRejectedValue(new Error('Failed') as never);

      await request(app)
        .post('/threats')
        .send({ type: 'malware', severity: 'high', sourceIp: '192.168.1.100' });

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log only error on failed GET', async () => {
      mockExecuteListThreats.mockRejectedValue(new Error('Failed') as never);

      await request(app).get('/threats');

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // DELETE /:threatId - ELIMINAR AMENAZA
  // ==========================================================================

  describe('DELETE /threats/:threatId - Delete Threat', () => {
    describe('Successful Deletion', () => {
      it('should return 200 when threat is deleted successfully', async () => {
        const deleteResult = {
          deleted: true,
          threatId: 'threat-123',
          message: 'Threat threat-123 deleted successfully'
        };
        mockExecuteDeleteThreat.mockResolvedValue(deleteResult as never);

        const response = await request(app).delete('/threats/threat-123');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          threatId: 'threat-123',
          message: 'Threat threat-123 deleted successfully'
        });
      });

      it('should call ServiceFactory.getDeleteThreatUseCase', async () => {
        mockExecuteDeleteThreat.mockResolvedValue({
          deleted: true, threatId: 'threat-123', message: 'Deleted'
        } as never);

        await request(app).delete('/threats/threat-123');

        expect(mockGetDeleteThreatUseCase).toHaveBeenCalled();
      });

      it('should call execute with threatId from URL params', async () => {
        mockExecuteDeleteThreat.mockResolvedValue({
          deleted: true, threatId: 'threat-xyz', message: 'Deleted'
        } as never);

        await request(app).delete('/threats/threat-xyz');

        expect(mockExecuteDeleteThreat).toHaveBeenCalledWith('threat-xyz');
      });

      it('should log success with threatId', async () => {
        mockExecuteDeleteThreat.mockResolvedValue({
          deleted: true, threatId: 'threat-123', message: 'Deleted'
        } as never);

        await request(app).delete('/threats/threat-123');

        expect(mockLogger.info).toHaveBeenCalledWith(
          'Threat deleted',
          { threatId: 'threat-123' }
        );
      });
    });

    describe('Threat Not Found', () => {
      it('should return 404 when threat does not exist', async () => {
        mockExecuteDeleteThreat.mockRejectedValue(
          new ThreatNotFoundException('nonexistent-id') as never
        );

        const response = await request(app).delete('/threats/nonexistent-id');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('nonexistent-id');
      });

      it('should log warning when threat not found', async () => {
        mockExecuteDeleteThreat.mockRejectedValue(
          new ThreatNotFoundException('missing-id') as never
        );

        await request(app).delete('/threats/missing-id');

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Threat not found for deletion',
          expect.objectContaining({ threatId: 'missing-id' })
        );
      });
    });

    describe('DELETE Error Handling', () => {
      it('should return 500 when use case throws unexpected error', async () => {
        mockExecuteDeleteThreat.mockRejectedValue(
          new Error('Database error') as never
        );

        const response = await request(app).delete('/threats/threat-123');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
          success: false,
          error: 'Failed to delete threat'
        });
      });

      it('should log error when deletion fails', async () => {
        const error = new Error('Connection refused');
        mockExecuteDeleteThreat.mockRejectedValue(error as never);

        await request(app).delete('/threats/threat-123');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to delete threat',
          { error: 'Connection refused' }
        );
      });

      it('should not expose internal error details', async () => {
        mockExecuteDeleteThreat.mockRejectedValue(
          new Error('SQL: DELETE FROM sensitive_table WHERE...') as never
        );

        const response = await request(app).delete('/threats/threat-123');

        expect(response.body.error).toBe('Failed to delete threat');
        expect(response.body.error).not.toContain('SQL');
      });
    });

    describe('DELETE Response Structure', () => {
      it('should return consistent success structure', async () => {
        mockExecuteDeleteThreat.mockResolvedValue({
          deleted: true, threatId: 'threat-123', message: 'Deleted'
        } as never);

        const response = await request(app).delete('/threats/threat-123');

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('threatId');
        expect(response.body).toHaveProperty('message');
      });

      it('should not include error field in success response', async () => {
        mockExecuteDeleteThreat.mockResolvedValue({
          deleted: true, threatId: 'threat-123', message: 'Deleted'
        } as never);

        const response = await request(app).delete('/threats/threat-123');

        expect(response.body).not.toHaveProperty('error');
      });
    });

    describe('DELETE Edge Cases', () => {
      it('should handle threatId with special characters', async () => {
        mockExecuteDeleteThreat.mockResolvedValue({
          deleted: true, threatId: 'threat-abc-123-xyz', message: 'Deleted'
        } as never);

        const response = await request(app).delete('/threats/threat-abc-123-xyz');

        expect(response.status).toBe(200);
      });

      it('should handle UUID format threatId', async () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        mockExecuteDeleteThreat.mockResolvedValue({
          deleted: true, threatId: uuid, message: 'Deleted'
        } as never);

        const response = await request(app).delete(`/threats/${uuid}`);

        expect(response.status).toBe(200);
        expect(mockExecuteDeleteThreat).toHaveBeenCalledWith(uuid);
      });
    });
  });
});