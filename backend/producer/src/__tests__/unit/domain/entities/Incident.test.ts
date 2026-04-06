import { describe, it, expect } from '@jest/globals';
import { Incident } from '../../../../domain/entities/Incident';
import { IncidentStatus } from '../../../../domain/value-objects/IncidentStatus';

const baseProps = {
  threatId:    'threat-uuid-001',
  title:       'malware desde 192.168.1.100',
  severity:    'high' as const,
  type:        'malware' as const,
  sourceIp:    '192.168.1.100',
  description: 'Malware detectado en endpoint',
  createdBy:   'user-uuid-admin',
};

describe('Incident entity', () => {

  describe('Incident.create()', () => {
    it('should create incident with all provided props', () => {
      const incident = Incident.create(baseProps);

      expect(incident.threatId).toBe('threat-uuid-001');
      expect(incident.title).toBe('malware desde 192.168.1.100');
      expect(incident.severity).toBe('high');
      expect(incident.type).toBe('malware');
      expect(incident.sourceIp).toBe('192.168.1.100');
      expect(incident.description).toBe('Malware detectado en endpoint');
      expect(incident.createdBy).toBe('user-uuid-admin');
    });

    it('should default status to OPEN when not provided', () => {
      const incident = Incident.create(baseProps);
      expect(incident.status).toBe(IncidentStatus.OPEN);
    });

    it('should default assignedTo to null when not provided', () => {
      const incident = Incident.create(baseProps);
      expect(incident.assignedTo).toBeNull();
    });

    it('should auto-generate a UUID id when not provided', () => {
      const incident = Incident.create(baseProps);
      expect(incident.id).toBeDefined();
      expect(typeof incident.id).toBe('string');
      expect(incident.id.length).toBeGreaterThan(0);
    });

    it('should use the provided id when given', () => {
      const incident = Incident.create({ ...baseProps, id: 'my-fixed-id' });
      expect(incident.id).toBe('my-fixed-id');
    });

    it('should auto-generate createdAt and updatedAt when not provided', () => {
      const before = new Date();
      const incident = Incident.create(baseProps);
      const after = new Date();

      expect(incident.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(incident.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(incident.updatedAt).toBeInstanceOf(Date);
    });

    it('two incidents created from same props should have different ids', () => {
      const i1 = Incident.create(baseProps);
      const i2 = Incident.create(baseProps);
      expect(i1.id).not.toBe(i2.id);
    });
  });

  describe('isActive()', () => {
    it('should return true for status=open', () => {
      const incident = Incident.create({ ...baseProps, status: IncidentStatus.OPEN });
      expect(incident.isActive()).toBe(true);
    });

    it('should return true for status=assigned', () => {
      const incident = Incident.create({ ...baseProps, status: IncidentStatus.ASSIGNED });
      expect(incident.isActive()).toBe(true);
    });

    it('should return false for status=closed', () => {
      const incident = Incident.create({ ...baseProps, status: IncidentStatus.CLOSED });
      expect(incident.isActive()).toBe(false);
    });
  });

  describe('toPlainObject()', () => {
    it('should serialize all fields correctly', () => {
      const fixedDate = new Date('2026-04-01T10:00:00.000Z');
      const incident = Incident.create({
        ...baseProps,
        id:        'fixed-id',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      });

      const obj = incident.toPlainObject();

      expect(obj.id).toBe('fixed-id');
      expect(obj.threatId).toBe('threat-uuid-001');
      expect(obj.status).toBe('open');
      expect(obj.createdAt).toBe('2026-04-01T10:00:00.000Z');
      expect(obj.updatedAt).toBe('2026-04-01T10:00:00.000Z');
      expect(obj.assignedTo).toBeNull();
    });
  });
});
