import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThreatValidationFactory } from '../threat-validation.factory';
import { ThreatType } from '../../../core/domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../core/domain/models/threat-severity.enum';
import {
  MalwareValidationStrategy,
  IntrusionValidationStrategy,
  PhishingValidationStrategy,
  DdosValidationStrategy,
  RansomwareValidationStrategy,
  DefaultValidationStrategy,
} from '../../strategies/threat-validation.strategy';

const baseThreat = {
  type: ThreatType.MALWARE,
  severity: ThreatSeverity.HIGH,
  sourceIp: '192.168.1.1',
  description: 'malware detected on workstation',
};

describe('ThreatValidationFactory', () => {
  let factory: ThreatValidationFactory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    factory = TestBed.inject(ThreatValidationFactory);
  });

  describe('createValidator — strategy selection', () => {
    it('should return MalwareValidationStrategy for MALWARE', () => {
      expect(factory.createValidator(ThreatType.MALWARE)).toBeInstanceOf(MalwareValidationStrategy);
    });

    it('should return PhishingValidationStrategy for PHISHING', () => {
      expect(factory.createValidator(ThreatType.PHISHING)).toBeInstanceOf(PhishingValidationStrategy);
    });

    it('should return DdosValidationStrategy for DDOS', () => {
      expect(factory.createValidator(ThreatType.DDOS)).toBeInstanceOf(DdosValidationStrategy);
    });

    it('should return RansomwareValidationStrategy for RANSOMWARE', () => {
      expect(factory.createValidator(ThreatType.RANSOMWARE)).toBeInstanceOf(RansomwareValidationStrategy);
    });

    it('should return IntrusionValidationStrategy for INTRUSION', () => {
      expect(factory.createValidator(ThreatType.INTRUSION)).toBeInstanceOf(IntrusionValidationStrategy);
    });
  });

  describe('MalwareValidationStrategy — validate()', () => {
    it('should pass when description contains malware keyword', () => {
      const result = factory.createValidator(ThreatType.MALWARE).validate({
        ...baseThreat,
        severity: ThreatSeverity.HIGH,
        description: 'malware signature detected',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when severity is LOW', () => {
      const result = factory.createValidator(ThreatType.MALWARE).validate({
        ...baseThreat,
        severity: ThreatSeverity.LOW,
        description: 'malware detected',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Malware no puede ser severidad LOW: implica un riesgo activo (mínimo MEDIUM)');
    });

    it('should fail when description does not mention malware or virus', () => {
      const result = factory.createValidator(ThreatType.MALWARE).validate({
        ...baseThreat,
        severity: ThreatSeverity.MEDIUM,
        description: 'suspicious activity on port 443',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('PhishingValidationStrategy — validate()', () => {
    it('should pass when description mentions phishing', () => {
      const result = factory.createValidator(ThreatType.PHISHING).validate({
        ...baseThreat,
        type: ThreatType.PHISHING,
        description: 'phishing email with credential harvesting link',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when description does not mention phishing or email', () => {
      const result = factory.createValidator(ThreatType.PHISHING).validate({
        ...baseThreat,
        type: ThreatType.PHISHING,
        description: 'suspicious network traffic detected',
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('"phishing" o "email"');
    });
  });

  describe('DdosValidationStrategy — validate()', () => {
    it('should pass when severity is CRITICAL', () => {
      const result = factory.createValidator(ThreatType.DDOS).validate({
        ...baseThreat,
        type: ThreatType.DDOS,
        severity: ThreatSeverity.CRITICAL,
        description: 'ddos attack on main load balancer',
      });
      expect(result.valid).toBe(true);
    });

    it('should pass when severity is HIGH', () => {
      const result = factory.createValidator(ThreatType.DDOS).validate({
        ...baseThreat,
        type: ThreatType.DDOS,
        severity: ThreatSeverity.HIGH,
        description: 'high-rate traffic detected',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when severity is MEDIUM', () => {
      const result = factory.createValidator(ThreatType.DDOS).validate({
        ...baseThreat,
        type: ThreatType.DDOS,
        severity: ThreatSeverity.MEDIUM,
        description: 'traffic anomaly',
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('HIGH o CRITICAL');
    });
  });

  describe('RansomwareValidationStrategy — validate()', () => {
    it('should pass when severity is CRITICAL', () => {
      const result = factory.createValidator(ThreatType.RANSOMWARE).validate({
        ...baseThreat,
        type: ThreatType.RANSOMWARE,
        severity: ThreatSeverity.CRITICAL,
        description: 'ransomware encrypting files on server',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when severity is not CRITICAL', () => {
      const result = factory.createValidator(ThreatType.RANSOMWARE).validate({
        ...baseThreat,
        type: ThreatType.RANSOMWARE,
        severity: ThreatSeverity.HIGH,
        description: 'ransomware detected but contained',
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('CRITICAL');
    });
  });

  describe('IntrusionValidationStrategy — validate()', () => {
    it('should pass with valid description containing intrusion keyword', () => {
      const result = factory.createValidator(ThreatType.INTRUSION).validate({
        ...baseThreat,
        type: ThreatType.INTRUSION,
        description: 'intrusion detected in internal network segment',
        sourceIp: '10.0.0.1',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when description does not mention intrusion, intruso or breach', () => {
      const result = factory.createValidator(ThreatType.INTRUSION).validate({
        ...baseThreat,
        type: ThreatType.INTRUSION,
        description: 'suspicious activity on network',
        sourceIp: '10.0.0.1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La descripción debe mencionar "intrusion", "intruso" o "breach" para este tipo de amenaza');
    });

    it('should fail when severity is LOW', () => {
      const result = factory.createValidator(ThreatType.INTRUSION).validate({
        ...baseThreat,
        type: ThreatType.INTRUSION,
        severity: ThreatSeverity.LOW,
        description: 'intrusion on internal network segment',
        sourceIp: '10.0.0.1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Intrusión no puede ser severidad LOW: implica acceso no autorizado (mínimo MEDIUM)');
    });
  });
});
