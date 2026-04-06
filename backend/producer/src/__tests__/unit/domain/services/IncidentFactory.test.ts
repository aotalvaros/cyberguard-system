import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { IncidentFactory, IncidentFactoryDeps } from '../../../../domain/services/IncidentFactory';
import { Threat } from '../../../../domain/entities/Threat';
import {
  InvalidIncidentCreationError,
  DuplicateIncidentError,
} from '../../../../domain/exceptions/IrmsExceptions';

/**
 * Tests para el servicio de dominio IncidentFactory
 * Validar reglas HU-001: solo ALTA/CRÍTICA → incidentes, sin duplicados
 */

describe('IncidentFactory — Servicio de Dominio', () => {
  let factory: IncidentFactory;
  let mockDeps: IncidentFactoryDeps;

  const baseThreat = Threat.create({
    threatId: 'threat-123',
    type: 'malware',
    severity: 'high',
    sourceIp: '192.168.1.100',
    description: 'Malware detected on endpoint',
    metadata: { processName: 'malware.exe' },
  });

  beforeEach(() => {
    mockDeps = {
      checkExistingIncident: jest.fn(async () => false),
    } as unknown as IncidentFactoryDeps;
    factory = new IncidentFactory(mockDeps);
  });

  describe('createFromThreat() — HU-001 validations', () => {
    it('should create incident from high severity threat', async () => {
      const highThreat = Threat.create({
        threatId: 'threat-999',
        type: 'intrusion',
        severity: 'high',
        sourceIp: '10.0.0.1',
        description: 'Intrusion detected',
      });
      const threatDbId = 999;

      const incident = await factory.createFromThreat(highThreat, threatDbId);

      expect(incident.threatId).toBe(999);
      expect(incident.severity).toBe('high');
      expect(incident.type).toBe('intrusion');
      expect(incident.status).toBe('open');
    });

    it('should create incident from critical severity threat', async () => {
      const criticalThreat = Threat.create({
        threatId: 'threat-888',
        type: 'ransomware',
        severity: 'critical',
        sourceIp: '192.168.1.50',
        description: 'Ransomware attack',
      });

      const incident = await factory.createFromThreat(criticalThreat, 888);

      expect(incident.severity).toBe('critical');
      expect(incident.status).toBe('open');
    });

    it('should map threat metadata to incident indicators', async () => {
      const threatWithMetadata = Threat.create({
        threatId: 'threat-777',
        type: 'ddos',
        severity: 'high',
        sourceIp: '203.0.113.0',
        description: 'DDoS attack',
        metadata: { requestsPerSec: 50000, port: 443 },
      });

      const incident = await factory.createFromThreat(threatWithMetadata, 777);

      expect(incident.indicators).toEqual({
        requestsPerSec: 50000,
        port: 443,
      });
    });

    it('should throw error on medium severity (violates HU-001)', async () => {
      const mediumThreat = Threat.create({
        threatId: 'threat-666',
        type: 'phishing',
        severity: 'medium',
        sourceIp: '1.2.3.4',
        description: 'Phishing email',
      });

      await expect(factory.createFromThreat(mediumThreat, 666)).rejects.toThrow(
        InvalidIncidentCreationError
      );
    });

    it('should throw error on low severity (violates HU-001)', async () => {
      const lowThreat = Threat.create({
        threatId: 'threat-555',
        type: 'phishing',
        severity: 'low',
        sourceIp: '5.5.5.5',
        description: 'Suspicious activity',
      });

      await expect(factory.createFromThreat(lowThreat, 555)).rejects.toThrow(
        InvalidIncidentCreationError
      );
    });
  });

  describe('duplicate detection', () => {
    it('should allow creation when no existing incident', async () => {
      (mockDeps.checkExistingIncident as jest.Mock) = jest.fn(async () => false);

      await expect(
        factory.createFromThreat(baseThreat, 123)
      ).resolves.toBeDefined();
    });

    it('should throw error when incident already exists', async () => {
      (mockDeps.checkExistingIncident as jest.Mock) = jest.fn(async () => true);
      const threat = Threat.create({
        threatId: 'threat-444',
        type: 'malware',
        severity: 'critical',
        sourceIp: '9.9.9.9',
        description: 'Malware',
      });

      await expect(factory.createFromThreat(threat, 444)).rejects.toThrow(
        DuplicateIncidentError
      );
    });

    it('should check for existing incident', async () => {
      const mockCheck = jest.fn(async () => false);
      mockDeps.checkExistingIncident = mockCheck as any;

      await factory.createFromThreat(baseThreat, 333);

      expect(mockCheck).toHaveBeenCalled();
    });
  });

  describe('integration', () => {
    it('complete flow: threat → incident with all fields', async () => {
      const threat = Threat.create({
        threatId: 'threat-222',
        type: 'ransomware',
        severity: 'critical',
        sourceIp: '10.20.30.40',
        description: 'Ransomware alert',
        metadata: {
          processName: 'ransomware.exe',
          fileExt: 'locked',
        },
      });

      const incident = await factory.createFromThreat(threat, 222);

      expect(incident.threatId).toBe(222);
      expect(incident.severity).toBe('critical');
      expect(incident.type).toBe('ransomware');
      expect(incident.status).toBe('open');
      expect(incident.assignedTo).toBeNull();
      expect(incident.source).toContain('10.20.30.40');
      expect(incident.indicators).toEqual({
        processName: 'ransomware.exe',
        fileExt: 'locked',
      });
    });

    it('severity validation runs before duplicate check', async () => {
      const lowThreat = Threat.create({
        threatId: 'threat-100',
        type: 'phishing',
        severity: 'low',
        sourceIp: '100.100.100.100',
        description: 'Test',
      });

      (mockDeps.checkExistingIncident as jest.Mock) = jest.fn(async () => true);

      // Should fail on severity, not on duplicate
      await expect(factory.createFromThreat(lowThreat, 100)).rejects.toThrow(
        InvalidIncidentCreationError
      );

      // checkExistingIncident should not have been called
      expect(mockDeps.checkExistingIncident).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate database errors', async () => {
      const dbError = new Error('DB connection failed');
      (mockDeps.checkExistingIncident as jest.Mock) = jest.fn(async () => {
        throw dbError;
      });

      await expect(factory.createFromThreat(baseThreat, 123)).rejects.toThrow(
        'DB connection failed'
      );
    });
  });
});
