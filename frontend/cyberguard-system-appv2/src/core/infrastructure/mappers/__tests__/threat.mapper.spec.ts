// Tipo de prueba: Unitario
import { describe, it, expect } from 'vitest';
import { 
  ThreatMapper, 
  toThreatRequestDto, 
  toThreatResponse, 
  toThreatTypeDto, 
  toThreatSeverityDto,
  toThreatType,
  toThreatSeverity,
  toThreatItem,
  toThreatList,
  toDeleteThreatResult
} from '../threat.mapper';
import { ThreatRequest } from '../../../domain/models/threat-request.model';
import { ThreatType } from '../../../domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../domain/models/threat-severity.enum';
import { ThreatResponseDto, ThreatItemDto, ThreatListResponseDto, DeleteThreatResponseDto } from '../../dto/threat.dto';

describe('ThreatMapper', () => {
  describe('toThreatTypeDto', () => {
    it('should convert ThreatType enum to string', () => {
      expect(toThreatTypeDto(ThreatType.MALWARE)).toBe('malware');
      expect(toThreatTypeDto(ThreatType.PHISHING)).toBe('phishing');
      expect(toThreatTypeDto(ThreatType.DDOS)).toBe('ddos');
      expect(toThreatTypeDto(ThreatType.RANSOMWARE)).toBe('ransomware');
      expect(toThreatTypeDto(ThreatType.INTRUSION)).toBe('intrusion');
    });
  });

  describe('toThreatSeverityDto', () => {
    it('should convert ThreatSeverity enum to string', () => {
      expect(toThreatSeverityDto(ThreatSeverity.LOW)).toBe('low');
      expect(toThreatSeverityDto(ThreatSeverity.MEDIUM)).toBe('medium');
      expect(toThreatSeverityDto(ThreatSeverity.HIGH)).toBe('high');
      expect(toThreatSeverityDto(ThreatSeverity.CRITICAL)).toBe('critical');
    });
  });

  describe('toThreatRequestDto', () => {
    it('should convert ThreatRequest to ThreatRequestDto', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.100',
        description: 'Malware detected'
      };

      const result = toThreatRequestDto(threat);

      expect(result).toEqual({
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Malware detected',
        targetIp: undefined,
        metadata: undefined
      });
    });

    it('should include optional fields when present', () => {
      const threat: ThreatRequest = {
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '10.0.0.1',
        targetIp: '192.168.1.50',
        description: 'Phishing attempt',
        metadata: { source: 'email', detected: true }
      };

      const result = toThreatRequestDto(threat);

      expect(result.targetIp).toBe('192.168.1.50');
      expect(result.metadata).toEqual({ source: 'email', detected: true });
    });

    it('should create a copy of metadata to avoid mutation', () => {
      const metadata = { key: 'value' };
      const threat: ThreatRequest = {
        type: ThreatType.DDOS,
        severity: ThreatSeverity.HIGH,
        sourceIp: '1.1.1.1',
        description: 'DDoS attack',
        metadata
      };

      const result = toThreatRequestDto(threat);

      expect(result.metadata).toEqual(metadata);
      expect(result.metadata).not.toBe(metadata); // Should be a copy
    });
  });

  describe('toThreatResponse', () => {
    it('should convert ThreatResponseDto to ThreatResponse', () => {
      const dto: ThreatResponseDto = {
        threatId: 'threat-12345',
        status: 'queued',
        message: 'Success'
      };

      const result = toThreatResponse(dto);

      expect(result.threatId).toBe('threat-12345');
    });

    it('should only include domain model fields', () => {
      const dto: ThreatResponseDto = {
        threatId: 'threat-999',
        status: 'processed',
        message: 'Done'
      };

      const result = toThreatResponse(dto);

      // Domain model only has threatId
      expect(Object.keys(result)).toEqual(['threatId']);
    });
  });

  describe('ThreatMapper namespace', () => {
    it('should expose all mapper functions', () => {
      expect(ThreatMapper.toThreatTypeDto).toBeDefined();
      expect(ThreatMapper.toThreatSeverityDto).toBeDefined();
      expect(ThreatMapper.toThreatRequestDto).toBeDefined();
      expect(ThreatMapper.toThreatResponse).toBeDefined();
      expect(ThreatMapper.toThreatType).toBeDefined();
      expect(ThreatMapper.toThreatSeverity).toBeDefined();
      expect(ThreatMapper.toThreatItem).toBeDefined();
      expect(ThreatMapper.toThreatList).toBeDefined();
      expect(ThreatMapper.toDeleteThreatResult).toBeDefined();
    });
  });

  describe('toThreatType', () => {
    it('should convert string to ThreatType enum', () => {
      expect(toThreatType('malware')).toBe(ThreatType.MALWARE);
      expect(toThreatType('phishing')).toBe(ThreatType.PHISHING);
      expect(toThreatType('ddos')).toBe(ThreatType.DDOS);
      expect(toThreatType('ransomware')).toBe(ThreatType.RANSOMWARE);
      expect(toThreatType('intrusion')).toBe(ThreatType.INTRUSION);
    });
  });

  describe('toThreatSeverity', () => {
    it('should convert string to ThreatSeverity enum', () => {
      expect(toThreatSeverity('low')).toBe(ThreatSeverity.LOW);
      expect(toThreatSeverity('medium')).toBe(ThreatSeverity.MEDIUM);
      expect(toThreatSeverity('high')).toBe(ThreatSeverity.HIGH);
      expect(toThreatSeverity('critical')).toBe(ThreatSeverity.CRITICAL);
    });
  });

  describe('toThreatItem', () => {
    it('should convert ThreatItemDto to ThreatItem', () => {
      const dto: ThreatItemDto = {
        threatId: 'threat-123',
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Malware detected',
        timestamp: '2026-02-19T10:30:00.000Z'
      };

      const result = toThreatItem(dto);

      expect(result.threatId).toBe('threat-123');
      expect(result.type).toBe(ThreatType.MALWARE);
      expect(result.severity).toBe(ThreatSeverity.HIGH);
      expect(result.sourceIp).toBe('192.168.1.100');
      expect(result.description).toBe('Malware detected');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.toISOString()).toBe('2026-02-19T10:30:00.000Z');
    });

    it('should include optional fields when present', () => {
      const dto: ThreatItemDto = {
        threatId: 'threat-456',
        type: 'phishing',
        severity: 'critical',
        sourceIp: '10.0.0.1',
        targetIp: '192.168.1.50',
        description: 'Phishing attack',
        timestamp: '2026-02-19T12:00:00.000Z',
        metadata: { source: 'email' }
      };

      const result = toThreatItem(dto);

      expect(result.targetIp).toBe('192.168.1.50');
      expect(result.metadata).toEqual({ source: 'email' });
    });

    it('should create a copy of metadata to avoid mutation', () => {
      const metadata = { key: 'value' };
      const dto: ThreatItemDto = {
        threatId: 'threat-789',
        type: 'ddos',
        severity: 'medium',
        sourceIp: '1.1.1.1',
        description: 'DDoS attack',
        timestamp: '2026-02-19T14:00:00.000Z',
        metadata
      };

      const result = toThreatItem(dto);

      expect(result.metadata).toEqual(metadata);
      expect(result.metadata).not.toBe(metadata);
    });
  });

  describe('toThreatList', () => {
    it('should convert ThreatListResponseDto to ThreatList', () => {
      const dto: ThreatListResponseDto = {
        threats: [
          {
            threatId: 'threat-1',
            type: 'malware',
            severity: 'high',
            sourceIp: '192.168.1.1',
            description: 'First threat',
            timestamp: '2026-02-19T10:00:00.000Z'
          },
          {
            threatId: 'threat-2',
            type: 'phishing',
            severity: 'low',
            sourceIp: '192.168.1.2',
            description: 'Second threat',
            timestamp: '2026-02-19T11:00:00.000Z'
          }
        ],
        total: 2
      };

      const result = toThreatList(dto);

      expect(result.total).toBe(2);
      expect(result.threats).toHaveLength(2);
      expect(result.threats[0].threatId).toBe('threat-1');
      expect(result.threats[1].threatId).toBe('threat-2');
    });

    it('should handle empty list', () => {
      const dto: ThreatListResponseDto = {
        threats: [],
        total: 0
      };

      const result = toThreatList(dto);

      expect(result.total).toBe(0);
      expect(result.threats).toHaveLength(0);
    });
  });

  describe('toDeleteThreatResult', () => {
    it('should convert DeleteThreatResponseDto to DeleteThreatResult', () => {
      const dto: DeleteThreatResponseDto = {
        success: true,
        threatId: 'threat-123',
        message: 'Threat deleted successfully'
      };

      const result = toDeleteThreatResult(dto);

      expect(result.success).toBe(true);
      expect(result.threatId).toBe('threat-123');
      expect(result.message).toBe('Threat deleted successfully');
    });

    it('should handle unsuccessful deletion', () => {
      const dto: DeleteThreatResponseDto = {
        success: false,
        threatId: 'threat-999',
        message: 'Threat not found'
      };

      const result = toDeleteThreatResult(dto);

      expect(result.success).toBe(false);
      expect(result.threatId).toBe('threat-999');
      expect(result.message).toBe('Threat not found');
    });
  });
});
