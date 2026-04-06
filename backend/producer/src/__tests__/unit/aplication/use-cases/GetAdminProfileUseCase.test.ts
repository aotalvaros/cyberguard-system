/**
 * Unit Tests: GetAdminProfileUseCase
 * TDD Phase: RED — use case does not exist yet
 *
 * VERIFICAR: el use case delega correctamente al repositorio.
 * VALIDAR:   el resultado excluye campos sensibles.
 * VALIDAR:   lanza ProfileNotFoundException cuando el usuario no existe.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GetAdminProfileUseCase } from '../../../../application/use-cases/GetAdminProfileUseCase';
import { UserRepository, UserRecord } from '../../../../domain/ports/UserRepository';
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
  updatedAt: new Date('2026-04-01T10:00:00Z'),
  ...overrides,
});

describe('GetAdminProfileUseCase', () => {
  let useCase: GetAdminProfileUseCase;
  let mockUserRepository: jest.Mocked<UserRepository>;

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
    useCase = new GetAdminProfileUseCase(mockUserRepository);
  });

  it('should call userRepository.findByUsername with the given username', async () => {
    mockUserRepository.findByUsername.mockResolvedValueOnce(makeUserRecord());

    await useCase.execute({ username: 'admin' });

    expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('admin');
    expect(mockUserRepository.findByUsername).toHaveBeenCalledTimes(1);
  });

  it('should return AdminProfileResult with expected fields when user exists', async () => {
    const record = makeUserRecord({ phone: '+573001234567' });
    mockUserRepository.findByUsername.mockResolvedValueOnce(record);

    const result = await useCase.execute({ username: 'admin' });

    expect(result).toMatchObject({
      username: 'admin',
      email: 'admin@cyberguard.com',
      role: 'admin',
      phone: '+573001234567',
    });
    expect(result.createdAt).toBeDefined();
  });

  it('should not include passwordHash, isLocked or failedAttempts in result', async () => {
    mockUserRepository.findByUsername.mockResolvedValueOnce(makeUserRecord());

    const result = await useCase.execute({ username: 'admin' });

    expect(result).not.toHaveProperty('isLocked');
    expect(result).not.toHaveProperty('failedAttempts');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('lastLogin');
  });

  it('should throw ProfileNotFoundException when user does not exist', async () => {
    mockUserRepository.findByUsername.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ username: 'nonexistent-user' })
    ).rejects.toThrow(ProfileNotFoundException);
  });
});
