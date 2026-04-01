import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { UpdateUserUseCase } from '../../../../application/use-cases/UpdateUserUseCase';
import { UserRepository, UserRecord } from '../../../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../../../domain/ports/AuditLogRepository';
import { UserNotFoundError } from '../../../../domain/exceptions/UserNotFoundError';
import { SelfModificationForbiddenError } from '../../../../domain/exceptions/SelfModificationForbiddenError';
import { UserRole } from '../../../../domain/value-objects/UserRole';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockAuditRepo: jest.Mocked<AuditLogRepository>;

  const adminId   = 'admin-uuid-123';
  const targetId  = 'user-uuid-456';

  const existingUser: UserRecord = {
    id: targetId,
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

  const updatedUser: UserRecord = {
    ...existingUser,
    fullName: 'Ana Maria Torres',
    role: UserRole.INCIDENT_HANDLER,
    updatedAt: new Date('2026-04-02'),
  };

  beforeEach(() => {
    mockUserRepo = {
      findById:             jest.fn().mockResolvedValue(existingUser as never),
      findByUsername:       jest.fn().mockResolvedValue(null as never),
      findByEmail:          jest.fn().mockResolvedValue(null as never),
      findAll:              jest.fn().mockResolvedValue([] as never),
      findAllActive:        jest.fn().mockResolvedValue([] as never),
      save:                 jest.fn().mockResolvedValue(existingUser as never),
      update:               jest.fn().mockResolvedValue(updatedUser as never),
      delete:               jest.fn().mockResolvedValue(false as never),
      resetFailedAttempts:  jest.fn().mockResolvedValue(undefined as never),
      updateLastLogin:      jest.fn().mockResolvedValue(undefined as never),
      incrementFailedAttempts: jest.fn().mockResolvedValue(undefined as never),
      lockUser:             jest.fn().mockResolvedValue(undefined as never),
    } as unknown as jest.Mocked<UserRepository>;

    mockAuditRepo = {
      log: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<AuditLogRepository>;

    useCase = new UpdateUserUseCase(mockUserRepo, mockAuditRepo);
  });

  // =========================================================================
  // HAPPY PATH
  // =========================================================================
  describe('execute() — happy path', () => {
    it('should update fullName and return the updated record', async () => {
      // GIVEN
      const input = { id: targetId, fullName: 'Ana Maria Torres', requestedBy: adminId };

      // WHEN
      const result = await useCase.execute(input);

      // THEN
      expect(mockUserRepo.findById).toHaveBeenCalledWith(targetId);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        targetId,
        expect.objectContaining({ fullName: 'Ana Maria Torres' })
      );
      expect(result.user.fullName).toBe('Ana Maria Torres');
    });

    it('should update role and record previousRole + newRole in audit log (CRITERIO-2.2)', async () => {
      // GIVEN
      const input = { id: targetId, role: UserRole.INCIDENT_HANDLER, requestedBy: adminId };

      // WHEN
      await useCase.execute(input);

      // THEN
      expect(mockAuditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId:  adminId,
          action:  'USER_ROLE_UPDATED',
          status:  'success',
          details: expect.objectContaining({
            previousRole: UserRole.SOC_ANALYST,
            newRole:      UserRole.INCIDENT_HANDLER,
          }),
        })
      );
    });

    it('should not include email in the update payload (CRITERIO-2.5)', async () => {
      // GIVEN
      const input = { id: targetId, fullName: 'Ana Updated', requestedBy: adminId };

      // WHEN
      await useCase.execute(input);

      // THEN — update llamado sin campo email
      const updatePayload = jest.mocked(mockUserRepo.update).mock.calls[0]?.[1];
      expect(updatePayload).not.toHaveProperty('email');
    });
  });

  // =========================================================================
  // ERROR PATHS
  // =========================================================================
  describe('execute() — error paths (CRITERIO-2.3, 2.4)', () => {
    it('should throw UserNotFoundError when user does not exist', async () => {
      // GIVEN
      jest.mocked(mockUserRepo.findById).mockResolvedValue(null);
      const input = { id: 'nonexistent-id', fullName: 'Someone', requestedBy: adminId };

      // WHEN / THEN
      await expect(useCase.execute(input)).rejects.toThrow(UserNotFoundError);
    });

    it('should throw SelfModificationForbiddenError when admin changes own role (CRITERIO-2.3)', async () => {
      // GIVEN — el admin intenta cambiar su propio rol
      const adminUser: UserRecord = { ...existingUser, id: adminId, role: UserRole.ADMIN };
      jest.mocked(mockUserRepo.findById).mockResolvedValue(adminUser);
      const input = { id: adminId, role: UserRole.SOC_ANALYST, requestedBy: adminId };

      // WHEN / THEN
      await expect(useCase.execute(input)).rejects.toThrow(SelfModificationForbiddenError);
    });

    it('should not call update when user is not found', async () => {
      // GIVEN
      jest.mocked(mockUserRepo.findById).mockResolvedValue(null);

      // WHEN — ignorar rechazo
      await useCase.execute({ id: 'missing', fullName: 'X', requestedBy: adminId }).catch(() => null);

      // THEN
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('should not call update when self-role-change is denied', async () => {
      // GIVEN
      const adminUser: UserRecord = { ...existingUser, id: adminId, role: UserRole.ADMIN };
      jest.mocked(mockUserRepo.findById).mockResolvedValue(adminUser);

      // WHEN — ignorar rechazo
      await useCase.execute({ id: adminId, role: UserRole.SOC_ANALYST, requestedBy: adminId }).catch(() => null);

      // THEN
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });
  });
});
