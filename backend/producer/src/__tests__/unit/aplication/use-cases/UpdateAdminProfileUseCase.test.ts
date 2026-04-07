/**
 * Unit Tests: UpdateAdminProfileUseCase
 * TDD Phase: RED — use case does not exist yet
 *
 * VERIFICAR: delega a updateProfile del repositorio con los datos correctos.
 * VERIFICAR: registra entrada en audit_logs tras actualización exitosa.
 * VALIDAR:   lanza EmailAlreadyExistsException si el email está en uso.
 * VALIDAR:   lanza RoleModificationNotAllowedException si el body incluye role.
 * VALIDAR:   lanza ProfileNotFoundException si el usuario no existe.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UpdateAdminProfileUseCase } from '../../../../application/use-cases/UpdateAdminProfileUseCase';
import { UserRepository, UserRecord } from '../../../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../../../domain/ports/AuditLogRepository';
import { EmailAlreadyExistsException } from '../../../../domain/exceptions/EmailAlreadyExistsException';
import { RoleModificationNotAllowedException } from '../../../../domain/exceptions/RoleModificationNotAllowedException';
import { ProfileNotFoundException } from '../../../../domain/exceptions/ProfileNotFoundException';

const makeUserRecord = (overrides: Partial<UserRecord> = {}): UserRecord => ({
  id: 'user-uuid-1',
  username: 'admin',
  email: 'admin@cyberguard.com',
  role: 'admin',
  phone: null,
  isLocked: false,
  failedAttempts: 0,
  lastLogin: new Date('2026-04-01T10:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-04-06T08:00:00Z'),
  ...overrides,
});

describe('UpdateAdminProfileUseCase', () => {
  let useCase: UpdateAdminProfileUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockAuditLogRepository: jest.Mocked<AuditLogRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      updateProfile: jest.fn(),
      delete: jest.fn(),
      resetFailedAttempts: jest.fn(),
      updateLastLogin: jest.fn(),
      incrementFailedAttempts: jest.fn(),
      lockUser: jest.fn(),
    };
    mockAuditLogRepository = {
      log: jest.fn(),
    } as jest.Mocked<AuditLogRepository>;

    useCase = new UpdateAdminProfileUseCase(mockUserRepository, mockAuditLogRepository);
  });

  it('should update profile and return updated AdminProfileResult', async () => {
    const updated = makeUserRecord({ username: 'admin-new' });
    mockUserRepository.findByUsername.mockResolvedValueOnce(makeUserRecord());
    mockUserRepository.findByEmail.mockResolvedValueOnce(null);
    mockUserRepository.updateProfile.mockResolvedValueOnce(updated);

    const result = await useCase.execute({
      username: 'admin',
      data: { username: 'admin-new' },
    });

    expect(result.username).toBe('admin-new');
    expect(mockUserRepository.updateProfile).toHaveBeenCalledWith('user-uuid-1', { username: 'admin-new' });
  });

  it('should register audit log entry on successful update', async () => {
    mockUserRepository.findByUsername.mockResolvedValueOnce(makeUserRecord());
    mockUserRepository.findByEmail.mockResolvedValueOnce(null);
    mockUserRepository.updateProfile.mockResolvedValueOnce(makeUserRecord({ phone: '+573001234567' }));

    await useCase.execute({
      username: 'admin',
      data: { phone: '+573001234567' },
    });

    expect(mockAuditLogRepository.log).toHaveBeenCalledTimes(1);
    expect(mockAuditLogRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROFILE_UPDATED',
        userId: 'user-uuid-1',
        status: 'success',
      })
    );
  });

  it('should throw EmailAlreadyExistsException when email is already taken by another user', async () => {
    mockUserRepository.findByUsername.mockResolvedValueOnce(makeUserRecord());
    mockUserRepository.findByEmail.mockResolvedValueOnce(
      makeUserRecord({ id: 'other-user-id', email: 'taken@cyberguard.com' })
    );

    await expect(
      useCase.execute({
        username: 'admin',
        data: { email: 'taken@cyberguard.com' },
      })
    ).rejects.toThrow(EmailAlreadyExistsException);

    expect(mockUserRepository.updateProfile).not.toHaveBeenCalled();
  });

  it('should throw RoleModificationNotAllowedException when data includes role', async () => {
    // Simula body con role inyectado en runtime (bypass TypeScript via cast)
    const dataWithRole = { username: 'admin', role: 'superadmin' } as unknown as Parameters<typeof useCase.execute>[0]['data'];

    await expect(
      useCase.execute({ username: 'admin', data: dataWithRole })
    ).rejects.toThrow(RoleModificationNotAllowedException);

    expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
  });

  it('should throw ProfileNotFoundException when user does not exist', async () => {
    mockUserRepository.findByUsername.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ username: 'nonexistent-user', data: { username: 'x' } })
    ).rejects.toThrow(ProfileNotFoundException);
  });
});
