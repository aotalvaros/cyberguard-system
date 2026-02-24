import { describe, it, expect, jest, beforeEach } from '@jest/globals';



// ==========================================================================
// MOCKS
// ==========================================================================

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: mockLogger
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-event-id-123')
}));

import { ThreatService } from '../../../../application/services/threat.service';
import { EventPublisher } from '../../../../domain/ports/EventPublisher';
import { ThreatRepository } from '../../../../domain/ports/ThreatRepository';
import { ThreatRequest } from '../../../../types';

describe('ThreatService', () => {
  let threatService: ThreatService;
  let mockEventPublisher: jest.Mocked<EventPublisher>;
  let mockThreatRepository: jest.Mocked<ThreatRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock EventPublisher
    mockEventPublisher = {
      publish: jest.fn().mockResolvedValue(undefined as never)
    } as jest.Mocked<EventPublisher>;

    // Mock ThreatRepository
    mockThreatRepository = {
      save: jest.fn().mockResolvedValue('threat-id-generated-by-repo' as never),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn()
    } as jest.Mocked<ThreatRepository>;

    // Crear instancia del servicio
    threatService = new ThreatService(mockEventPublisher, mockThreatRepository);

    // Reset logger mocks
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();
  });

  // ==========================================================================
  // REPORTE EXITOSO - HAPPY PATH
  // ==========================================================================

  describe('Successful Threat Reporting', () => {
    it('should report threat successfully and return threatId from repository', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Malware detected'
      };

      const threatId = await threatService.reportThreat(threatData);

      expect(threatId).toBe('threat-id-generated-by-repo');
      expect(typeof threatId).toBe('string');
    });

    it('should call threatRepository.save with threat data', async () => {
      const threatData: ThreatRequest = {
        type: 'intrusion',
        severity: 'critical',
        sourceIp: '10.0.0.1',
        description: 'Intrusion attempt'
      };

      await threatService.reportThreat(threatData);

      expect(mockThreatRepository.save).toHaveBeenCalledTimes(1);
      const savedData = mockThreatRepository.save.mock.calls[0][0];
      
      expect(savedData).toHaveProperty('threatId');
      expect(savedData).toHaveProperty('type', 'intrusion');
      expect(savedData).toHaveProperty('severity', 'critical');
      expect(savedData).toHaveProperty('sourceIp', '10.0.0.1');
      expect(savedData).toHaveProperty('description', 'Intrusion attempt');
    });

    it('should publish event with correct routing key', async () => {
      const threatData: ThreatRequest = {
        type: 'phishing',
        severity: 'medium',
        sourceIp: '192.168.1.50',
        description: 'Phishing attempt'
      };

      await threatService.reportThreat(threatData);

      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'threat.detected.phishing',
        expect.any(Object)
      );
    });

    it('should log success with threatId and routing key', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Threat reported successfully',
        expect.objectContaining({
          threatId: 'threat-id-generated-by-repo',
          type: 'malware',
          severity: 'high',
          routingKey: 'threat.detected.malware'
        })
      );
    });

    it('should include all required event properties', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      const publishCall = mockEventPublisher.publish.mock.calls[0][1];
      
      expect(publishCall).toHaveProperty('eventId');
      expect(publishCall).toHaveProperty('eventType', 'threat.detected');
      expect(publishCall).toHaveProperty('timestamp');
      expect(publishCall).toHaveProperty('data');
    });
  });

  // ==========================================================================
  // THREAT.CREATE - CREACIÓN DE ENTIDAD
  // ==========================================================================

  describe('Threat Entity Creation', () => {
    it('should create threat entity from request data', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Malware detected'
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];
      
      // La entidad debe haber sido creada correctamente
      expect(savedData.type).toBe('malware');
      expect(savedData.severity).toBe('high');
      expect(savedData.sourceIp).toBe('192.168.1.100');
      expect(savedData.description).toBe('Malware detected');
    });

    it('should include threatId generated by Threat.create', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];
      expect(savedData.threatId).toBeDefined();
      expect(typeof savedData.threatId).toBe('string');
    });

    it('should create threat with timestamp', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];
      expect(savedData.timestamp).toBeDefined();
      expect(typeof savedData.timestamp).toBe('string');
    });
  });

  // ==========================================================================
  // REPOSITORY INTEGRATION
  // ==========================================================================

  describe('Repository Integration', () => {
    it('should save threat to repository before publishing event', async () => {
      const callOrder: string[] = [];

      mockThreatRepository.save.mockImplementation(async () => {
        callOrder.push('save');
        return 'threat-id-123';
      });

      mockEventPublisher.publish.mockImplementation(async () => {
        callOrder.push('publish');
      });

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(callOrder[0]).toBe('save');
      expect(callOrder[1]).toBe('publish');
    });

    it('should propagate repository errors', async () => {
      mockThreatRepository.save.mockRejectedValue(
        new Error('Database connection failed')
      );

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await expect(threatService.reportThreat(threatData)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should not publish event if repository save fails', async () => {
      mockThreatRepository.save.mockRejectedValue(new Error('Save failed'));

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      try {
        await threatService.reportThreat(threatData);
      } catch (error) {
        // Expected error
      }

      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });

    it('should use threatId from repository save result', async () => {
      mockThreatRepository.save.mockResolvedValue('repo-generated-threat-id-456');

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      const threatId = await threatService.reportThreat(threatData);

      expect(threatId).toBe('repo-generated-threat-id-456');
    });

    it('should pass correct data structure to repository', async () => {
      const threatData: ThreatRequest = {
        type: 'ransomware',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        targetIp: '10.0.0.1',
        description: 'Ransomware encryption attack',
        metadata: { files: 5000, encrypted: true }
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];

      expect(savedData).toEqual({
        threatId: expect.any(String),
        type: 'ransomware',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        targetIp: '10.0.0.1',
        description: 'Ransomware encryption attack',
        metadata: { files: 5000, encrypted: true },
        timestamp: expect.any(String)
      });
    });
  });

  // ==========================================================================
  // EVENT PUBLISHING
  // ==========================================================================

  describe('Event Publishing', () => {
    it('should generate correct routing key for each threat type', async () => {
      const threatTypes = ['malware', 'intrusion', 'phishing', 'ddos', 'ransomware'];

      for (const type of threatTypes) {
        jest.clearAllMocks();
        
        const threatData: ThreatRequest = {
          type: type as any,
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test'
        };

        await threatService.reportThreat(threatData);

        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          `threat.detected.${type}`,
          expect.any(Object)
        );
      }
    });

    it('should include threatId in event data', async () => {
      mockThreatRepository.save.mockResolvedValue('threat-id-789');

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      const event = mockEventPublisher.publish.mock.calls[0][1] as { data: Record<string, unknown> };
      expect(event.data.threatId).toBe('threat-id-789');
    });

    it('should include all threat data in event', async () => {
      const threatData: ThreatRequest = {
        type: 'intrusion',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        targetIp: '10.0.0.1',
        description: 'Intrusion attempt',
        metadata: { port: 22 }
      };

      await threatService.reportThreat(threatData);

      const event = mockEventPublisher.publish.mock.calls[0][1];
      
      expect(event.data).toEqual({
        threatId: expect.any(String),
        type: 'intrusion',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        description: 'Intrusion attempt',
        metadata: { port: 22 }
      });
    });

    it('should have eventType threat.detected', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      const event = mockEventPublisher.publish.mock.calls[0][1];
      expect(event.eventType).toBe('threat.detected');
    });

    it('should use generated eventId from uuid', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      const event = mockEventPublisher.publish.mock.calls[0][1];
      expect(event.eventId).toBe('generated-event-id-123');
    });

    it('should include ISO timestamp in event', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      const event = mockEventPublisher.publish.mock.calls[0][1];
      expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should propagate publisher errors', async () => {
      mockEventPublisher.publish.mockRejectedValue(
        new Error('Message broker unavailable')
      );

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await expect(threatService.reportThreat(threatData)).rejects.toThrow(
        'Message broker unavailable'
      );
    });
  });

  // ==========================================================================
  // THREAT TYPES & SEVERITY LEVELS
  // ==========================================================================

  describe('Threat Types', () => {
    const threatTypes = ['malware', 'intrusion', 'phishing', 'ddos', 'ransomware'];

    threatTypes.forEach(type => {
      it(`should handle ${type} threat type`, async () => {
        const threatData: ThreatRequest = {
          type: type as any,
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: `${type} detected`
        };

        const threatId = await threatService.reportThreat(threatData);

        expect(threatId).toBeDefined();
        expect(mockEventPublisher.publish).toHaveBeenCalledWith(
          `threat.detected.${type}`,
          expect.any(Object)
        );
      });
    });
  });

  describe('Severity Levels', () => {
    const severityLevels = ['low', 'medium', 'high', 'critical'];

    severityLevels.forEach(severity => {
      it(`should handle ${severity} severity level`, async () => {
        const threatData: ThreatRequest = {
          type: 'malware',
          severity: severity as any,
          sourceIp: '192.168.1.100',
          description: 'Test'
        };

        const threatId = await threatService.reportThreat(threatData);

        expect(threatId).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // OPTIONAL FIELDS
  // ==========================================================================

  describe('Optional Fields', () => {
    it('should handle threat with targetIp', async () => {
      const threatData: ThreatRequest = {
        type: 'ddos',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        targetIp: '10.0.0.1',
        description: 'DDoS attack'
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];
      expect(savedData.targetIp).toBe('10.0.0.1');

      const event = mockEventPublisher.publish.mock.calls[0][1];
      expect(event.data).not.toHaveProperty('targetIp');
    });

    it('should handle threat with metadata', async () => {
      const metadata = { hash: 'abc123', filename: 'malware.exe', size: 1024 };

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Malware detected',
        metadata
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];
      expect(savedData.metadata).toEqual(metadata);

      const event = mockEventPublisher.publish.mock.calls[0][1] as { data: Record<string, unknown> };
      expect(event.data.metadata).toEqual(metadata);
    });

    it('should handle threat without optional fields', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Minimal threat'
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];
      expect(savedData.targetIp).toBeUndefined();
      expect(savedData.metadata).toBeUndefined();
    });

    it('should handle complex nested metadata', async () => {
      const metadata = {
        file: {
          name: 'malware.exe',
          hash: { md5: 'abc123', sha256: 'def456' },
          size: 2048
        },
        process: { pid: 1234, name: 'explorer.exe' },
        network: { srcIp: '192.168.1.1', dstIp: '10.0.0.1' }
      };

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Complex metadata test',
        metadata
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];
      expect(savedData.metadata).toEqual(metadata);
    });
  });

  // ==========================================================================
  // LOGGING BEHAVIOR
  // ==========================================================================

  describe('Logging', () => {
    it('should log info on successful threat report', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should log error message correctly', async () => {
      mockThreatRepository.save.mockRejectedValue(new Error('DB error'));

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      try {
        await threatService.reportThreat(threatData);
      } catch (error) {
        // Expected error
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to report threat',
        expect.objectContaining({
          error: 'DB error',
          threatType: 'malware'
        })
      );
    });

    it('should log with threatType on error', async () => {
      mockThreatRepository.save.mockRejectedValue(new Error('Failed'));

      const threatData: ThreatRequest = {
        type: 'ransomware',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      try {
        await threatService.reportThreat(threatData);
      } catch (error) {
        // Expected error
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          threatType: 'ransomware'
        })
      );
    });

    it('should log success with complete context', async () => {
      const threatData: ThreatRequest = {
        type: 'intrusion',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Threat reported successfully',
        {
          threatId: expect.any(String),
          type: 'intrusion',
          severity: 'critical',
          routingKey: 'threat.detected.intrusion'
        }
      );
    });

    it('should not log sensitive metadata', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test',
        metadata: { apiKey: 'secret-key-123', token: 'bearer-xyz' }
      };

      await threatService.reportThreat(threatData);

      const logCall = mockLogger.info.mock.calls[0];
      const logString = JSON.stringify(logCall);

      expect(logString).not.toContain('secret-key');
      expect(logString).not.toContain('bearer-xyz');
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('should throw error from repository', async () => {
      const error = new Error('Connection timeout');
      mockThreatRepository.save.mockRejectedValue(error);

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await expect(threatService.reportThreat(threatData)).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('should throw error from event publisher', async () => {
      mockEventPublisher.publish.mockRejectedValue(
        new Error('Broker refused connection')
      );

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await expect(threatService.reportThreat(threatData)).rejects.toThrow(
        'Broker refused connection'
      );
    });

    it('should not proceed if repository fails', async () => {
      mockThreatRepository.save.mockRejectedValue(new Error('Save failed'));

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      try {
        await threatService.reportThreat(threatData);
      } catch (error) {
        // Expected error
      }

      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log error information when repository fails', async () => {
      mockThreatRepository.save.mockRejectedValue(
        new Error('Database error details')
      );

      const threatData: ThreatRequest = {
        type: 'phishing',
        severity: 'medium',
        sourceIp: '192.168.1.50',
        description: 'Test'
      };

      try {
        await threatService.reportThreat(threatData);
      } catch (error) {
        // Expected error
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to report threat',
        expect.objectContaining({
          error: 'Database error details',
          threatType: 'phishing'
        })
      );
    });
  });

  // ==========================================================================
  // DEPENDENCY INJECTION
  // ==========================================================================

  describe('Dependency Injection', () => {
    it('should be instantiable with EventPublisher and ThreatRepository', () => {
      expect(threatService).toBeInstanceOf(ThreatService);
    });

    it('should use injected EventPublisher', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(mockEventPublisher.publish).toHaveBeenCalled();
    });

    it('should use injected ThreatRepository', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(mockThreatRepository.save).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {

    it('should handle special characters in description', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Special chars: !@#$%^&*() []{}|'
      };

      const threatId = await threatService.reportThreat(threatData);

      expect(typeof threatId).toBe('string');
    });

    it('should handle unicode characters', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Amenaza detectada 日本語 中文 한글'
      };

      const threatId = await threatService.reportThreat(threatData);

      expect(typeof threatId).toBe('string');
    });

    it('should handle empty metadata', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test',
        metadata: {}
      };

      const threatId = await threatService.reportThreat(threatData);

      expect(typeof threatId).toBe('string');
    });

    it('should handle IPv6 addresses', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '::1',
        targetIp: '2001:db8::1',
        description: 'IPv6 test'
      };

      await threatService.reportThreat(threatData);

      const savedData = mockThreatRepository.save.mock.calls[0][0];
      expect(savedData.sourceIp).toBe('::1');
      expect(savedData.targetIp).toBe('2001:db8::1');
    });
  });

  // ==========================================================================
  // EXECUTION FLOW
  // ==========================================================================

  describe('Execution Flow', () => {
    it('should execute operations in correct order', async () => {
      const callOrder: string[] = [];

      mockThreatRepository.save.mockImplementation(async () => {
        callOrder.push('save');
        return 'threat-id';
      });

      mockEventPublisher.publish.mockImplementation(async () => {
        callOrder.push('publish');
      });

      mockLogger.info.mockImplementation(() => {
        callOrder.push('log');
      });

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(callOrder).toEqual(['save', 'publish', 'log']);
    });

    it('should handle complete flow successfully', async () => {
      const threatData: ThreatRequest = {
        type: 'intrusion',
        severity: 'critical',
        sourceIp: '192.168.1.100',
        targetIp: '10.0.0.1',
        description: 'Full flow test',
        metadata: { port: 22 }
      };

      const threatId = await threatService.reportThreat(threatData);

      // Verify all operations executed
      expect(mockThreatRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(typeof threatId).toBe('string');
    });
  });

  // ==========================================================================
  // INTEGRATION & CONTRACTS
  // ==========================================================================

  describe('Integration & API Contracts', () => {
    it('should always return a string threatId', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      const threatId = await threatService.reportThreat(threatData);

      expect(typeof threatId).toBe('string');
      expect(threatId.length).toBeGreaterThan(0);
    });

    it('should always publish exactly one event', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
    });

    it('should always save exactly one threat', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(mockThreatRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should always log exactly once on success', async () => {
      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await threatService.reportThreat(threatData);

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });

    it('should propagate all errors up the call stack', async () => {
      mockThreatRepository.save.mockRejectedValue(new Error('Test error'));

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      await expect(threatService.reportThreat(threatData)).rejects.toThrow(
        'Test error'
      );
    });

    it('should handle non-Error thrown values (string) — covers String(error) branch', async () => {
      // Arrange — throw a string to cover the `false` branch of `error instanceof Error`
      mockThreatRepository.save.mockRejectedValue('db_connection_lost' as never);

      const threatData: ThreatRequest = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test'
      };

      // Act & Assert — the service re-throws after logging; non-Error values propagate raw
      await expect(threatService.reportThreat(threatData)).rejects.toBe(
        'db_connection_lost'
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to report threat',
        expect.objectContaining({ error: 'db_connection_lost' })
      );
    });
  });
});