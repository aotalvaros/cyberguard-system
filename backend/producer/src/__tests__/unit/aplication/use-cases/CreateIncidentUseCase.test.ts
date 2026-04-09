
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CreateIncidentUseCase } from '../../../../application/use-cases/CreateIncidentUseCase';
import { ThreatRepository } from '../../../../domain/ports/ThreatRepository';
import { IncidentRepository, IncidentRecord } from '../../../../domain/ports/IncidentRepository';
import { AuditLogRepository } from '../../../../domain/ports/AuditLogRepository';
import { UserRepository, UserRecord } from '../../../../domain/ports/UserRepository';
import { InvalidIncidentCreationError, DuplicateIncidentError, ThreatNotFoundForIncidentError } from '../../../../domain/exceptions/IrmsExceptions';
import { IncidentStatus } from '../../../../domain/value-objects/IncidentStatus';

describe('CreateIncidentUseCase', () => {
  let useCase: CreateIncidentUseCase;
  let mockThreatRepo:    jest.Mocked<ThreatRepository>;
  let mockIncidentRepo:  jest.Mocked<IncidentRepository>;
  let mockAuditRepo:     jest.Mocked<AuditLogRepository>;
  let mockUserRepo:      jest.Mocked<UserRepository>;

  const handlerUser: UserRecord = {
    id: 'handler-uuid-1', username: 'handler1', email: 'handler@cyberguard.com',
    role: 'incident_handler', fullName: 'Handler One', phone: null,
    isActive: true, isLocked: false, failedAttempts: 0, lastLogin: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  const highThreat = {
    threatId:    'threat-uuid-high',
    type:        'malware',
    severity:    'high',
    sourceIp:    '192.168.1.100',
    description: 'Malware detectado',
    metadata:    {},
  };

  const criticalThreat = { ...highThreat, threatId: 'threat-uuid-crit', severity: 'critical', type: 'ransomware' };
  const mediumThreat   = { ...highThreat, threatId: 'threat-uuid-med',  severity: 'medium',   type: 'phishing' };
  const lowThreat      = { ...highThreat, threatId: 'threat-uuid-low',  severity: 'low',      type: 'phishing' };

  const savedIncident: IncidentRecord = {
    id:          'incident-uuid-new',
    threatId:    'threat-uuid-high',
    title:       'malware desde 192.168.1.100',
    status:      IncidentStatus.OPEN,
    severity:    'high',
    type:        'malware',
    sourceIp:    '192.168.1.100',
    description: 'Malware detectado',
    createdBy:   'user-admin-uuid',
    assignedTo:  null,
    createdAt:   new Date('2026-04-01T10:00:00.000Z'),
    updatedAt:   new Date('2026-04-01T10:00:00.000Z'),
  };

  beforeEach(() => {
    mockThreatRepo = {
      findById:  jest.fn().mockResolvedValue(highThreat as never),
      findAll:   jest.fn().mockResolvedValue([] as never),
      save:      jest.fn().mockResolvedValue('uuid' as never),
      delete:    jest.fn().mockResolvedValue(true as never),
    } as jest.Mocked<ThreatRepository>;

    mockIncidentRepo = {
      save:                       jest.fn().mockResolvedValue(savedIncident as never),
      findAll:                    jest.fn().mockResolvedValue([] as never),
      findById:                   jest.fn().mockResolvedValue(null as never),
      findActiveByThreatId:       jest.fn().mockResolvedValue(null as never),
      findActiveByAssignedUserId: jest.fn().mockResolvedValue([] as never),
      unassignByUserId:           jest.fn().mockResolvedValue(0 as never),
    } as jest.Mocked<IncidentRepository>;

    mockAuditRepo = {
      log: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<AuditLogRepository>;

    mockUserRepo = {
      findById:               jest.fn().mockResolvedValue(null as never),
      findByUsername:         jest.fn().mockResolvedValue(null as never),
      findByEmail:            jest.fn().mockResolvedValue(null as never),
      findAll:                jest.fn().mockResolvedValue([] as never),
      findAllActive:          jest.fn().mockResolvedValue([] as never),  // no handlers by default
      save:                   jest.fn().mockResolvedValue({} as never),
      update:                 jest.fn().mockResolvedValue({} as never),
      updateProfile:          jest.fn().mockResolvedValue({} as never),
      delete:                 jest.fn().mockResolvedValue(true as never),
      resetFailedAttempts:    jest.fn().mockResolvedValue(undefined as never),
      updateLastLogin:        jest.fn().mockResolvedValue(undefined as never),
      incrementFailedAttempts:jest.fn().mockResolvedValue(undefined as never),
      lockUser:               jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<UserRepository>;

    useCase = new CreateIncidentUseCase(mockThreatRepo, mockIncidentRepo, mockAuditRepo, mockUserRepo);
  });

  // ── HAPPY PATH ─────────────────────────────────────────────────────────────
  describe('execute() — happy path', () => {
    it('CRITERIO-1.1: should create incident from high severity threat', async () => {
      const result = await useCase.execute({
        threatId:  'threat-uuid-high',
        createdBy: 'user-admin-uuid',
      });

      expect(result.incident.threatId).toBe('threat-uuid-high');
      expect(result.incident.status).toBe(IncidentStatus.OPEN);
      expect(result.incident.severity).toBe('high');
      expect(mockIncidentRepo.save).toHaveBeenCalledTimes(1);
    });

    it('CRITERIO-1.2: should create incident from critical severity threat', async () => {
      jest.mocked(mockThreatRepo.findById).mockResolvedValueOnce(criticalThreat as never);
      jest.mocked(mockIncidentRepo.save).mockResolvedValueOnce({
        ...savedIncident,
        threatId: 'threat-uuid-crit',
        severity: 'critical',
        type:     'ransomware',
        title:    'ransomware desde 192.168.1.100',
      } as never);

      const result = await useCase.execute({
        threatId:  'threat-uuid-crit',
        createdBy: 'user-admin-uuid',
      });

      expect(result.incident.severity).toBe('critical');
      expect(result.incident.status).toBe(IncidentStatus.OPEN);
    });

    it('should set title as "{type} desde {sourceIp}"', async () => {
      const result = await useCase.execute({
        threatId:  'threat-uuid-high',
        createdBy: 'user-admin-uuid',
      });

      expect(result.incident.title).toBe('malware desde 192.168.1.100');
    });

    it('should set assignedTo to null when no active incident_handler exists', async () => {
      // mockUserRepo.findAllActive returns [] by default → no handlers
      const result = await useCase.execute({
        threatId:  'threat-uuid-high',
        createdBy: 'user-admin-uuid',
      });

      expect(result.incident.assignedTo).toBeNull();
    });

    it('CRITERIO-AUTO-ASSIGN: should auto-assign to available incident_handler', async () => {
      jest.mocked(mockUserRepo.findAllActive).mockResolvedValueOnce([handlerUser] as never);
      jest.mocked(mockIncidentRepo.findActiveByAssignedUserId).mockResolvedValueOnce([] as never);
      const assignedIncident = { ...savedIncident, assignedTo: 'handler-uuid-1' };
      jest.mocked(mockIncidentRepo.save).mockResolvedValueOnce(assignedIncident as never);

      const result = await useCase.execute({
        threatId:  'threat-uuid-high',
        createdBy: 'user-admin-uuid',
      });

      expect(result.incident.assignedTo).toBe('handler-uuid-1');
    });

    it('CRITERIO-AUTO-ASSIGN: should assign to handler with fewest active incidents', async () => {
      const handler2: UserRecord = { ...handlerUser, id: 'handler-uuid-2', username: 'handler2', email: 'h2@cyberguard.com' };
      jest.mocked(mockUserRepo.findAllActive).mockResolvedValueOnce([handlerUser, handler2] as never);
      // handler1 has 2 active incidents, handler2 has 0
      jest.mocked(mockIncidentRepo.findActiveByAssignedUserId)
        .mockResolvedValueOnce([savedIncident, savedIncident] as never)  // handler1 workload=2
        .mockResolvedValueOnce([] as never);                              // handler2 workload=0
      const assignedIncident = { ...savedIncident, assignedTo: 'handler-uuid-2' };
      jest.mocked(mockIncidentRepo.save).mockResolvedValueOnce(assignedIncident as never);

      const result = await useCase.execute({
        threatId:  'threat-uuid-high',
        createdBy: 'user-admin-uuid',
      });

      expect(result.incident.assignedTo).toBe('handler-uuid-2');
    });

    it('CRITERIO-AUTO-ASSIGN: should create unassigned if userRepository fails', async () => {
      jest.mocked(mockUserRepo.findAllActive).mockRejectedValueOnce(new Error('DB error') as never);

      const result = await useCase.execute({
        threatId:  'threat-uuid-high',
        createdBy: 'user-admin-uuid',
      });

      expect(result.incident).toBeDefined(); // incident still created
    });

    it('should set createdBy from input parameter', async () => {
      const result = await useCase.execute({
        threatId:  'threat-uuid-high',
        createdBy: 'user-admin-uuid',
      });

      expect(result.incident.createdBy).toBe('user-admin-uuid');
    });

    it('CRITERIO-1.7: should allow creation when previous incident is closed', async () => {
      // findActiveByThreatId returns null (no active) — previous was closed
      jest.mocked(mockIncidentRepo.findActiveByThreatId).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ threatId: 'threat-uuid-high', createdBy: 'user-admin-uuid' })
      ).resolves.toBeDefined();
    });

    it('should log INCIDENT_CREATED in audit on success', async () => {
      await useCase.execute({ threatId: 'threat-uuid-high', createdBy: 'user-admin-uuid' });

      expect(mockAuditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-admin-uuid',
          action: 'INCIDENT_CREATED',
          status: 'success',
        })
      );
    });
  });

  // ── ERROR PATHS ────────────────────────────────────────────────────────────
  describe('execute() — error paths', () => {
    it('CRITERIO-1.5: should throw ThreatNotFoundForIncidentError when threat does not exist', async () => {
      jest.mocked(mockThreatRepo.findById).mockResolvedValueOnce(null);

      await expect(
        useCase.execute({ threatId: 'nonexistent', createdBy: 'user-admin-uuid' })
      ).rejects.toThrow(ThreatNotFoundForIncidentError);
    });

    it('CRITERIO-1.3: should throw InvalidIncidentCreationError for medium severity', async () => {
      jest.mocked(mockThreatRepo.findById).mockResolvedValueOnce(mediumThreat as never);

      await expect(
        useCase.execute({ threatId: 'threat-uuid-med', createdBy: 'user-admin-uuid' })
      ).rejects.toThrow(InvalidIncidentCreationError);
    });

    it('CRITERIO-1.3: should throw InvalidIncidentCreationError for low severity', async () => {
      jest.mocked(mockThreatRepo.findById).mockResolvedValueOnce(lowThreat as never);

      await expect(
        useCase.execute({ threatId: 'threat-uuid-low', createdBy: 'user-admin-uuid' })
      ).rejects.toThrow(InvalidIncidentCreationError);
    });

    it('CRITERIO-1.4: should throw DuplicateIncidentError when active incident already exists', async () => {
      const existingActive: IncidentRecord = { ...savedIncident, id: 'existing-uuid' };
      jest.mocked(mockIncidentRepo.findActiveByThreatId).mockResolvedValueOnce(existingActive);

      await expect(
        useCase.execute({ threatId: 'threat-uuid-high', createdBy: 'user-admin-uuid' })
      ).rejects.toThrow(DuplicateIncidentError);
    });

    it('should NOT call save when threat is not found', async () => {
      jest.mocked(mockThreatRepo.findById).mockResolvedValueOnce(null);
      await useCase.execute({ threatId: 'xxx', createdBy: 'user' }).catch(() => null);
      expect(mockIncidentRepo.save).not.toHaveBeenCalled();
    });

    it('should NOT call save when severity is invalid', async () => {
      jest.mocked(mockThreatRepo.findById).mockResolvedValueOnce(mediumThreat as never);
      await useCase.execute({ threatId: 'threat-uuid-med', createdBy: 'user' }).catch(() => null);
      expect(mockIncidentRepo.save).not.toHaveBeenCalled();
    });

    it('severity validation runs BEFORE duplicate check (CRITERIO-1.3 > CRITERIO-1.4)', async () => {
      jest.mocked(mockThreatRepo.findById).mockResolvedValueOnce(lowThreat as never);
      jest.mocked(mockIncidentRepo.findActiveByThreatId).mockResolvedValueOnce(savedIncident);

      await useCase.execute({ threatId: 'low', createdBy: 'user' }).catch(() => null);

      // findActiveByThreatId should NOT be called — failed on severity first
      expect(mockIncidentRepo.findActiveByThreatId).not.toHaveBeenCalled();
    });

    it('should still return the incident when audit log rejects (non-critical side-effect)', async () => {
      // audit log failure should NOT propagate — it's a side-effect wrapped in .catch()
      jest.mocked(mockAuditRepo.log).mockRejectedValueOnce(new Error('audit DB down') as never);

      const result = await useCase.execute({
        threatId:  'threat-uuid-high',
        createdBy: 'user-admin-uuid',
      });

      // Creation still succeeds
      expect(result.incident.id).toBe('incident-uuid-new');
      expect(mockIncidentRepo.save).toHaveBeenCalledTimes(1);
    });
  });
});
