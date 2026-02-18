import { describe, it, expect, beforeEach } from 'vitest';
import {
  MalwareValidationStrategy,
  PhishingValidationStrategy,
  DdosValidationStrategy,
  RansomwareValidationStrategy
} from '../threat-validation.strategy';
import { ThreatRequest } from '../../../core/domain/models/threat-request.model';
import { ThreatType } from '../../../core/domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../core/domain/models/threat-severity.enum';

describe('ThreatValidationStrategies', () => {
  describe('MalwareValidationStrategy', () => {
    let strategy: MalwareValidationStrategy;

    beforeEach(() => {
      strategy = new MalwareValidationStrategy();
    });

    it('should validate malware threat with correct description', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Detected malware in system files'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject malware with low severity', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.LOW,
        sourceIp: '192.168.1.1',
        description: 'Malware detected'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Malware threats should be at least medium severity');
    });
  });

  describe('DdosValidationStrategy', () => {
    let strategy: DdosValidationStrategy;

    beforeEach(() => {
      strategy = new DdosValidationStrategy();
    });

    it('should validate critical DDoS attack', () => {
      const threat: ThreatRequest = {
        type: ThreatType.DDOS,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '192.168.1.1',
        description: 'DDoS attack detected'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(true);
    });

    it('should reject DDoS with medium severity', () => {
      const threat: ThreatRequest = {
        type: ThreatType.DDOS,
        severity: ThreatSeverity.MEDIUM,
        sourceIp: '192.168.1.1',
        description: 'DDoS attack'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(false);
    });
  });

  describe('RansomwareValidationStrategy', () => {
    let strategy: RansomwareValidationStrategy;

    beforeEach(() => {
      strategy = new RansomwareValidationStrategy();
    });

    it('should validate critical ransomware', () => {
      const threat: ThreatRequest = {
        type: ThreatType.RANSOMWARE,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '192.168.1.1',
        description: 'Ransomware detected'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(true);
    });
  });
});
