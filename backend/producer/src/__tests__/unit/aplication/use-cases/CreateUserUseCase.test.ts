import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CreateUserUseCase } from '../../../../application/use-cases/CreateUserUseCase';
import { UserRepository, UserRecord } from '../../../../domain/ports/UserRepository';
import { AuditLogRepository } from '../../../../domain/ports/AuditLogRepository';
import { UserAlreadyExistsError } from '../../../../domain/exceptions/UserAlreadyExistsError';
import { UserRole } from '../../../../domain/value-objects/UserRole';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockAuditRepo: jest.Mocked<AuditLogRepository>;

  const adminId = 'admin-uuid-123';

  const savedUser: UserRecord = {
    id: 'new-user-uuid',
    username: 'ana.torres',
    email: 'ana.torres@example.com',
    fullName: 'Ana Torres',
    phone: null,
    role: UserRole.SOC_ANALYST,
    isActive: true,
    isLocked: false,
    failedAttempts: 0,
    lastLogin: null,
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
  };

  beforeEach(() => {
    mockUserRepo = {
      findById:             jest.fn().mockResolvedValue(null as never),
      findByUsername:       jest.fn().mockResolvedValue(null as never),
      findByEmail:          jest.fn().mockResolvedValue(null as never),
      findAll:              jest.fn().mockResolvedValue([] as never),
      findAllActive:        jest.fn().mockResolvedValue([] as never),
      save:                 jest.fn().mockResolvedValue(savedUser as never),
      update:               jest.fn().mockResolvedValue(savedUser as never),
      delete:               jest.fn().mockResolvedValue(false as never),
      resetFailedAttempts:  jest.fn().mockResolvedValue(undefined as never),
      updateLastLogin:      jest.fn().mockResolvedValue(undefined as never),
      incrementFailedAttempts: jest.fn().mockResolvedValue(undefined as never),
      lockUser:             jest.fn().mockResolvedValue(undefined as never),
    } as unknown as jest.Mocked<UserRepository>;

    mockAuditRepo = {
      log: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<AuditLogRepository>;

    useCase = new CreateUserUseCase(mockUserRepo, mockAuditRepo);
  });

  // =========================================================================
  // HAPPY PATH
  // =========================================================================
  describe('execute() — happy path', () => {
    it('should create user and return the saved record', async () => {
      // GIVEN
      const input = {
        email: 'ana.torres@example.com',
        fullName: 'Ana Torres',
        role: UserRole.SOC_ANALYST,
        username: 'ana.torres',
      };

      // WHEN
      const result = await useCase.execute(input, adminId);

      // THEN
      expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('ana.torres@example.com');
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
      expect(result.user.email).toBe('ana.torres@example.com');
      expect(result.user.isActive).toBe(true);
      expect(result.user.role).toBe(UserRole.SOC_ANALYST);
    });

    it('should log USER_CREATED action to audit after success', async () => {
      // GIVEN
      const input = {
        email: 'ana.torres@example.com',
        fullName: 'Ana Torres',
        role: UserRole.SOC_ANALYST,
        username: 'ana.torres',
      };

      // WHEN
      await useCase.execute(input, adminId);

      // THEN
      expect(mockAuditRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: adminId,
          action: 'USER_CREATED',
          status: 'success',
        })
      );
    });

    it('should create user with isActive=true by default', async () => {
      // GIVEN
      const input = { email: 'new@test.com', fullName: 'New User', role: UserRole.CISO, username: 'new.user' };

      // WHEN
      const result = await useCase.execute(input, adminId);

      // THEN — el usuario se crea siempre activo
      expect(result.user.isActive).toBe(true);
    });
  });

  // =========================================================================
  // ERROR PATHS
  // =========================================================================
  describe('execute() — error paths (CRITERIO-1.2, 1.3, 1.4)', () => {
    it('should throw UserAlreadyExistsError when email is already registered', async () => {
      // GIVEN — email ya existe
      jest.mocked(mockUserRepo.findByEmail).mockResolvedValue(savedUser);

      // WHEN / THEN
      await expect(
        useCase.execute(
          { email: 'ana.torres@example.com', fullName: 'Ana Torres', role: UserRole.SOC_ANALYST, username: 'ana.torres' },
          adminId
        )
      ).rejects.toThrow(UserAlreadyExistsError);
    });

    it('should not call save when a duplicate email is detected', async () => {
      // GIVEN
      jest.mocked(mockUserRepo.findByEmail).mockResolvedValue(savedUser);

      // WHEN — ignorar rechazo
      await useCase.execute(
        { email: 'ana.torres@example.com', fullName: 'Ana Torres', role: UserRole.SOC_ANALYST, username: 'ana.torres' },
        adminId
      ).catch(() => null);

      // THEN — save nunca se llama
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('should throw when fullName is blank (whitespace only)', async () => {
      // GIVEN — fullName vacío
      const input = { email: 'new@example.com', fullName: '   ', role: UserRole.SOC_ANALYST, username: 'new.user' };

      // WHEN / THEN
      await expect(useCase.execute(input, adminId)).rejects.toThrow();
    });

    it('should throw when role is not a valid IRMS role', async () => {
      // GIVEN — rol inventado
      const input = { email: 'new@example.com', fullName: 'New User', role: 'superuser' as UserRole, username: 'new.user' };

      // WHEN / THEN
      await expect(useCase.execute(input, adminId)).rejects.toThrow();
    });
  });
});
