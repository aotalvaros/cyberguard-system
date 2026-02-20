import { describe, it, expect, beforeEach } from 'vitest';
import {
  MalwareValidationStrategy,
  PhishingValidationStrategy,
  DdosValidationStrategy,
  RansomwareValidationStrategy,
  DefaultValidationStrategy
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

    it('should validate malware threat with virus in description', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Detected virus in system files'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(true);
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

    it('should reject malware without malware/virus keyword', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Some suspicious activity'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Malware threats should mention malware or virus');
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

    it('should reject ransomware with non-critical severity', () => {
      const threat: ThreatRequest = {
        type: ThreatType.RANSOMWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Ransomware detected'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Ransomware should always be critical severity');
    });
  });

  describe('PhishingValidationStrategy', () => {
    let strategy: PhishingValidationStrategy;

    beforeEach(() => {
      strategy = new PhishingValidationStrategy();
    });

    it('should validate phishing threat with phishing keyword', () => {
      const threat: ThreatRequest = {
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.MEDIUM,
        sourceIp: '192.168.1.1',
        description: 'Phishing attempt detected'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(true);
    });

    it('should validate phishing threat with email keyword', () => {
      const threat: ThreatRequest = {
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Suspicious email detected'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(true);
    });

    it('should reject phishing without phishing/email keyword', () => {
      const threat: ThreatRequest = {
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.MEDIUM,
        sourceIp: '192.168.1.1',
        description: 'Suspicious activity'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Phishing threats should mention phishing or email');
    });
  });

  describe('DefaultValidationStrategy', () => {
    let strategy: DefaultValidationStrategy;

    beforeEach(() => {
      strategy = new DefaultValidationStrategy();
    });

    it('should validate threat with correct data', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'This is a valid threat description'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(true);
    });

    it('should reject short description', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Short'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description must be at least 10 characters');
    });

    it('should reject invalid IP format', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: 'invalid-ip',
        description: 'Valid description here'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid source IP format');
    });

    it('should reject both short description and invalid IP', () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: 'bad-ip',
        description: 'Short'
      };

      const result = strategy.validate(threat);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });
  });
});
