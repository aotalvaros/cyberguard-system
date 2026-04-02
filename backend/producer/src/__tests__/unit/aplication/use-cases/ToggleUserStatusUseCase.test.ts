import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ToggleUserStatusUseCase } from '../../../../application/use-cases/ToggleUserStatusUseCase';
import { UserRepository, UserRecord } from '../../../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../../../domain/ports/AuditLogRepository';
import { IncidentRepository, ActiveIncidentRecord } from '../../../../domain/ports/IncidentRepository';
import { SelfModificationForbiddenError } from '../../../../domain/exceptions/SelfModificationForbiddenError';
import { UserNotFoundError } from '../../../../domain/exceptions/UserNotFoundError';
import { UserRole } from '../../../../domain/value-objects/UserRole';

describe('ToggleUserStatusUseCase', () => {
  let useCase: ToggleUserStatusUseCase;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockAuditRepo: jest.Mocked<AuditLogRepository>;
  let mockIncidentRepo: jest.Mocked<IncidentRepository>;

  const adminId     = 'admin-uuid-123';
  const targetUserId = 'analyst-uuid-456';

  const activeUser: UserRecord = {
    id: targetUserId,
    username: 'ana.torres',
    email: 'ana.torres@example.com',
    fullName: 'Ana Torres',
    role: UserRole.SOC_ANALYST,
    isActive: true,
    isLocked: false,
    failedAttempts: 0,
    lastLogin: null,
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
  };

  const deactivatedUser: UserRecord = { ...activeUser, isActive: false };

  const twoActiveIncidents: ActiveIncidentRecord[] = [
    { id: 'incident-1', threatId: 'threat-1', status: 'assigned',       assignedTo: targetUserId },
    { id: 'incident-2', threatId: 'threat-2', status: 'in_containment', assignedTo: targetUserId },
  ];

  beforeEach(() => {
    mockUserRepo = {
      findById:             jest.fn().mockResolvedValue(activeUser as never),
      findByUsername:       jest.fn().mockResolvedValue(null as never),
      findByEmail:          jest.fn().mockResolvedValue(null as never),
      findAll:              jest.fn().mockResolvedValue([] as never),
      findAllActive:        jest.fn().mockResolvedValue([] as never),
      save:                 jest.fn().mockResolvedValue(activeUser as never),
      update:               jest.fn().mockResolvedValue(deactivatedUser as never),
      delete:               jest.fn().mockResolvedValue(false as never),
      resetFailedAttempts:  jest.fn().mockResolvedValue(undefined as never),
      updateLastLogin:      jest.fn().mockResolvedValue(undefined as never),
      incrementFailedAttempts: jest.fn().mockResolvedValue(undefined as never),
      lockUser:             jest.fn().mockResolvedValue(undefined as never),
    } as unknown as jest.Mocked<UserRepository>;

    mockAuditRepo = {
      log: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<AuditLogRepository>;

    mockIncidentRepo = {
      save:                       jest.fn().mockResolvedValue(null as never),
      findAll:                    jest.fn().mockResolvedValue([] as never),
      findById:                   jest.fn().mockResolvedValue(null as never),
      findActiveByThreatId:       jest.fn().mockResolvedValue(null as never),
      findActiveByAssignedUserId: jest.fn().mockResolvedValue([] as never),
      unassignByUserId:           jest.fn().mockResolvedValue(0 as never),
    } as unknown as jest.Mocked<IncidentRepository>;

    useCase = new ToggleUserStatusUseCase(mockUserRepo, mockAuditRepo, mockIncidentRepo);
  });

    describe('execute() — deactivate (isActive=false)', () => {
    it('should deactivate user and reassign active incidents (CRITERIO-3.1)', async () => {
      // GIVEN — 2 incidentes activos
      jest.mocked(mockIncidentRepo.findActiveByAssignedUserId).mockResolvedValue(twoActiveIncidents);
      jest.mocked(mockIncidentRepo.unassignByUserId).mockResolvedValue(2);
      jest.mocked(mockUserRepo.update).mockResolvedValue(deactivatedUser);

      // WHEN
      const result = await useCase.execute({ id: targetUserId, isActive: false, requestedBy: adminId });

      // THEN
      expect(mockUserRepo.update).toHaveBeenCalledWith(targetUserId, expect.objectContaining({ isActive: false }));
      expect(mockIncidentRepo.unassignByUserId).toHaveBeenCalledWith(targetUserId);
      expect(result.reassignedIncidents).toBe(2);
      expect(result.user.isActive).toBe(false);
    });

    it('should deactivate user with no active incidents and return reassignedIncidents=0', async () => {
      // GIVEN — sin incidentes
      jest.mocked(mockIncidentRepo.findActiveByAssignedUserId).mockResolvedValue([]);
      jest.mocked(mockIncidentRepo.unassignByUserId).mockResolvedValue(0);
      jest.mocked(mockUserRepo.update).mockResolvedValue(deactivatedUser);

      // WHEN
      const result = await useCase.execute({ id: targetUserId, isActive: false, requestedBy: adminId });

      // THEN
      expect(result.reassignedIncidents).toBe(0);
    });

    it('should log USER_DEACTIVATED in audit with deactivatedBy', async () => {
      // WHEN
      await useCase.execute({ id: targetUserId, isActive: false, requestedBy: adminId });

      // THEN
      expect(mockAuditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminId,
          action: 'USER_DEACTIVATED',
          status: 'success',
          details: expect.objectContaining({ targetUserId }),
        })
      );
    });
  });

  describe('execute() — reactivate (isActive=true)', () => {
    it('should reactivate user successfully (CRITERIO-3.2)', async () => {
      // GIVEN — usuario inactivo
      const inactiveUser: UserRecord = { ...activeUser, isActive: false };
      jest.mocked(mockUserRepo.findById).mockResolvedValue(inactiveUser);
      jest.mocked(mockUserRepo.update).mockResolvedValue({ ...inactiveUser, isActive: true });

      // WHEN
      const result = await useCase.execute({ id: targetUserId, isActive: true, requestedBy: adminId });

      // THEN
      expect(mockUserRepo.update).toHaveBeenCalledWith(targetUserId, expect.objectContaining({ isActive: true }));
      expect(result.user.isActive).toBe(true);
    });

    it('should NOT call unassign when reactivating', async () => {
      // GIVEN
      const inactiveUser: UserRecord = { ...activeUser, isActive: false };
      jest.mocked(mockUserRepo.findById).mockResolvedValue(inactiveUser);
      jest.mocked(mockUserRepo.update).mockResolvedValue({ ...inactiveUser, isActive: true });

      // WHEN
      await useCase.execute({ id: targetUserId, isActive: true, requestedBy: adminId });

      // THEN — desactivar limpia incidentes, reactivar NO los reasigna
      expect(mockIncidentRepo.unassignByUserId).not.toHaveBeenCalled();
    });

    it('should log USER_REACTIVATED in audit', async () => {
      // GIVEN
      const inactiveUser: UserRecord = { ...activeUser, isActive: false };
      jest.mocked(mockUserRepo.findById).mockResolvedValue(inactiveUser);
      jest.mocked(mockUserRepo.update).mockResolvedValue({ ...inactiveUser, isActive: true });

      // WHEN
      await useCase.execute({ id: targetUserId, isActive: true, requestedBy: adminId });

      // THEN
      expect(mockAuditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_REACTIVATED', status: 'success' })
      );
    });
  });

  describe('execute() — error paths', () => {
    it('should throw SelfModificationForbiddenError when admin deactivates own account (CRITERIO-3.3)', async () => {
      // GIVEN — el admin intenta desactivarse a sí mismo
      const adminUser: UserRecord = { ...activeUser, id: adminId };
      jest.mocked(mockUserRepo.findById).mockResolvedValue(adminUser);

      // WHEN / THEN
      await expect(
        useCase.execute({ id: adminId, isActive: false, requestedBy: adminId })
      ).rejects.toThrow(SelfModificationForbiddenError);
    });

    it('should throw UserNotFoundError when user does not exist', async () => {
      // GIVEN
      jest.mocked(mockUserRepo.findById).mockResolvedValue(null);

      // WHEN / THEN
      await expect(
        useCase.execute({ id: 'nonexistent', isActive: false, requestedBy: adminId })
      ).rejects.toThrow(UserNotFoundError);
    });

    it('should not call update when user is not found', async () => {
      // GIVEN
      jest.mocked(mockUserRepo.findById).mockResolvedValue(null);

      // WHEN — ignorar rechazo
      await useCase.execute({ id: 'nonexistent', isActive: false, requestedBy: adminId }).catch(() => null);

      // THEN
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });
  });
});
