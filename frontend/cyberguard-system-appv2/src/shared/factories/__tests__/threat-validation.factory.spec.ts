import {describe, it, expect, beforeEach} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ThreatValidationFactory } from '../threat-validation.factory';
import { ThreatType } from '../../../core/domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../core/domain/models/threat-severity.enum';
import {
  MalwareValidationStrategy,
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
    TestBed.resetTestingModule();

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

    it('should return DefaultValidationStrategy for INTRUSION (unhandled type)', () => {
      expect(factory.createValidator(ThreatType.INTRUSION)).toBeInstanceOf(DefaultValidationStrategy);
    });
  });

  describe('MalwareValidationStrategy — validate()', () => {
    it('should pass with any description and severity', () => {
      const result = factory.createValidator(ThreatType.MALWARE).validate({
        ...baseThreat,
        severity: ThreatSeverity.LOW,
        description: 'suspicious activity on port 443',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('PhishingValidationStrategy — validate()', () => {
    it('should pass with any description and severity', () => {
      const result = factory.createValidator(ThreatType.PHISHING).validate({
        ...baseThreat,
        type: ThreatType.PHISHING,
        description: 'suspicious network traffic detected',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
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

    it('should pass when severity is MEDIUM (no severity restriction)', () => {
      const result = factory.createValidator(ThreatType.DDOS).validate({
        ...baseThreat,
        type: ThreatType.DDOS,
        severity: ThreatSeverity.MEDIUM,
        description: 'traffic anomaly',
      });
      expect(result.valid).toBe(true);
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

    it('should pass when severity is not CRITICAL (no severity restriction)', () => {
      const result = factory.createValidator(ThreatType.RANSOMWARE).validate({
        ...baseThreat,
        type: ThreatType.RANSOMWARE,
        severity: ThreatSeverity.HIGH,
        description: 'ransomware detected but contained',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('DefaultValidationStrategy — validate()', () => {
    it('should pass with valid description and IP', () => {
      const result = factory.createValidator(ThreatType.INTRUSION).validate({
        ...baseThreat,
        type: ThreatType.INTRUSION,
        description: 'intrusion detected in internal network segment',
        sourceIp: '10.0.0.1',
      });
      expect(result.valid).toBe(true);
    });

    it('should fail when description is too short', () => {
      const result = factory.createValidator(ThreatType.INTRUSION).validate({
        ...baseThreat,
        type: ThreatType.INTRUSION,
        description: 'short',
        sourceIp: '10.0.0.1',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Description must be at least 10 characters');
    });

    it('should fail when sourceIp is invalid', () => {
      const result = factory.createValidator(ThreatType.INTRUSION).validate({
        ...baseThreat,
        type: ThreatType.INTRUSION,
        description: 'intrusion on internal network segment',
        sourceIp: 'not-an-ip',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid source IP format');
    });
  });
});
