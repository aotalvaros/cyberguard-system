import { describe, it, expect } from '@jest/globals';
import { createThreatSchema } from '../../../../../infrastructure/http/validators/threat.schema';

describe('Threat Validation Schema', () => {
  const validThreat = {
    type: 'malware',
    severity: 'high',
    sourceIp: '192.168.1.100',
    description: 'Malware detected in network segment',
  };

  describe('Valid Threats', () => {
    it('should validate a complete valid threat', () => {
      const { error } = createThreatSchema.validate(validThreat);
      expect(error).toBeUndefined();
    });

    it('should validate threat with all optional fields', () => {
      const fullThreat = {
        ...validThreat,
        targetIp: '10.0.0.1',
        metadata: { hash: 'abc123', filename: 'malware.exe' },
      };

      const { error } = createThreatSchema.validate(fullThreat);
      expect(error).toBeUndefined();
    });

    it('should strip unknown fields', () => {
      const threatWithExtra = {
        ...validThreat,
        unknownField: 'should be removed',
        anotherExtra: 123,
      };

      const { error, value } = createThreatSchema.validate(threatWithExtra);
      expect(error).toBeUndefined();
      expect(value).not.toHaveProperty('unknownField');
      expect(value).not.toHaveProperty('anotherExtra');
    });

    it('should accept IPv6 addresses for sourceIp', () => {
      const ipv6Threat = { ...validThreat, sourceIp: '::1' };
      const { error } = createThreatSchema.validate(ipv6Threat);
      expect(error).toBeUndefined();
    });

    it('should accept IPv6 addresses for targetIp', () => {
      const ipv6Threat = {
        ...validThreat,
        targetIp: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      };
      const { error } = createThreatSchema.validate(ipv6Threat);
      expect(error).toBeUndefined();
    });
  });

  describe('type field', () => {
    it.each(['malware', 'intrusion', 'phishing', 'ddos', 'ransomware'])(
      'should accept valid type: %s',
      (type) => {
        const { error } = createThreatSchema.validate({ ...validThreat, type });
        expect(error).toBeUndefined();
      }
    );

    it('should reject invalid type', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        type: 'unknown-type',
      });
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('malware');
    });

    it('should reject missing type', () => {
      const { type: _removed, ...noType } = validThreat;
      const { error } = createThreatSchema.validate(noType);
      expect(error).toBeDefined();
      expect(error?.details[0]?.path).toContain('type');
    });

    it('should reject empty type', () => {
      const { error } = createThreatSchema.validate({ ...validThreat, type: '' });
      expect(error).toBeDefined();
    });
  });

  describe('severity field', () => {
    it.each(['low', 'medium', 'high', 'critical'])(
      'should accept valid severity: %s',
      (severity) => {
        const { error } = createThreatSchema.validate({
          ...validThreat,
          severity,
        });
        expect(error).toBeUndefined();
      }
    );

    it('should reject invalid severity', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        severity: 'extreme',
      });
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('low');
    });

    it('should reject missing severity', () => {
      const { severity: _removed, ...noSeverity } = validThreat;
      const { error } = createThreatSchema.validate(noSeverity);
      expect(error).toBeDefined();
      expect(error?.details[0]?.path).toContain('severity');
    });
  });

  describe('sourceIp field', () => {
    it('should accept valid IPv4 address', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        sourceIp: '10.0.0.1',
      });
      expect(error).toBeUndefined();
    });

    it('should reject invalid IP address', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        sourceIp: 'not-an-ip',
      });
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('sourceIp');
    });

    it('should reject missing sourceIp', () => {
      const { sourceIp: _removed, ...noSourceIp } = validThreat;
      const { error } = createThreatSchema.validate(noSourceIp);
      expect(error).toBeDefined();
      expect(error?.details[0]?.path).toContain('sourceIp');
    });

    it('should reject empty sourceIp', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        sourceIp: '',
      });
      expect(error).toBeDefined();
    });
  });

  describe('targetIp field', () => {
    it('should accept valid targetIp', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        targetIp: '10.0.0.2',
      });
      expect(error).toBeUndefined();
    });

    it('should accept missing targetIp (optional)', () => {
      const { error } = createThreatSchema.validate(validThreat);
      expect(error).toBeUndefined();
    });

    it('should reject invalid targetIp', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        targetIp: 'invalid-ip',
      });
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('targetIp');
    });
  });

  describe('description field', () => {
    it('should accept description with 10 characters', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        description: 'A'.repeat(10),
      });
      expect(error).toBeUndefined();
    });

    it('should accept description with 500 characters', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        description: 'A'.repeat(500),
      });
      expect(error).toBeUndefined();
    });

    it('should reject description shorter than 10 characters', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        description: 'Short',
      });
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('10');
    });

    it('should reject description longer than 500 characters', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        description: 'A'.repeat(501),
      });
      expect(error).toBeDefined();
      expect(error?.details[0]?.message).toContain('500');
    });

    it('should reject missing description', () => {
      const { description: _removed, ...noDescription } = validThreat;
      const { error } = createThreatSchema.validate(noDescription);
      expect(error).toBeDefined();
      expect(error?.details[0]?.path).toContain('description');
    });

    it('should reject empty description', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        description: '',
      });
      expect(error).toBeDefined();
    });
  });

  describe('metadata field', () => {
    it('should accept valid metadata object', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        metadata: { key: 'value', nested: { data: 123 } },
      });
      expect(error).toBeUndefined();
    });

    it('should accept missing metadata (optional)', () => {
      const { error } = createThreatSchema.validate(validThreat);
      expect(error).toBeUndefined();
    });

    it('should accept empty metadata object', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        metadata: {},
      });
      expect(error).toBeUndefined();
    });

    it('should reject non-object metadata', () => {
      const { error } = createThreatSchema.validate({
        ...validThreat,
        metadata: 'not-an-object',
      });
      expect(error).toBeDefined();
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should return all errors at once (abortEarly: false)', () => {
      const { error } = createThreatSchema.validate({});
      expect(error).toBeDefined();
      expect(error?.details.length).toBeGreaterThanOrEqual(4);
    });

    it('should identify each invalid field', () => {
      const { error } = createThreatSchema.validate({
        type: 'invalid',
        severity: 'extreme',
        sourceIp: 'not-ip',
        description: 'short',
      });
      expect(error).toBeDefined();
      const fields = error?.details.map((d) => d.path[0]);
      expect(fields).toContain('type');
      expect(fields).toContain('severity');
      expect(fields).toContain('sourceIp');
      expect(fields).toContain('description');
    });
  });
});
