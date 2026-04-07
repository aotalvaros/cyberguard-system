import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ListUsersUseCase } from '../../../../application/use-cases/ListUsersUseCase';
import { UserRepository, UserRecord } from '../../../../domain/ports/UserRepository';

const makeUserRecord = (overrides?: Partial<UserRecord>): UserRecord => ({
  id:             'user-uuid-1',
  username:       'alice',
  email:          'alice@example.com',
  fullName:       'Alice Smith',
  role:           'soc_analyst',
  isActive:       true,
  isLocked:       false,
  failedAttempts: 0,
  lastLogin:      null,
  createdAt:      new Date('2026-01-01'),
  updatedAt:      new Date('2026-02-01'),
  ...overrides,
});

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let mockRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockRepo = {
      findById:               jest.fn(),
      findByUsername:         jest.fn(),
      findByEmail:            jest.fn(),
      findAll:                jest.fn().mockResolvedValue([makeUserRecord()] as never),
      findAllActive:          jest.fn(),
      save:                   jest.fn(),
      update:                 jest.fn(),
      delete:                 jest.fn(),
      resetFailedAttempts:    jest.fn(),
      updateLastLogin:        jest.fn(),
      incrementFailedAttempts: jest.fn(),
      lockUser:               jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    useCase = new ListUsersUseCase(mockRepo);
  });

  it('should return a list with one item and total=1', async () => {
    const result = await useCase.execute();
    expect(result.users).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should map all UserRecord fields to UserListItem correctly', async () => {
    const record = makeUserRecord();
    mockRepo.findAll.mockResolvedValueOnce([record] as never);

    const result = await useCase.execute();
    const user   = result.users[0]!;

    expect(user.id).toBe(record.id);
    expect(user.username).toBe(record.username);
    expect(user.email).toBe(record.email);
    expect(user.fullName).toBe(record.fullName);
    expect(user.role).toBe(record.role);
    expect(user.isActive).toBe(record.isActive);
    expect(user.isLocked).toBe(record.isLocked);
    expect(user.lastLogin).toBe(record.lastLogin);
    expect(user.createdAt).toBe(record.createdAt);
  });

  it('should preserve null lastLogin in the mapped item', async () => {
    const record = makeUserRecord({ lastLogin: null });
    mockRepo.findAll.mockResolvedValueOnce([record] as never);

    const result = await useCase.execute();
    expect(result.users[0]!.lastLogin).toBeNull();
  });

  it('should preserve a non-null lastLogin date', async () => {
    const loginDate = new Date('2026-03-15');
    const record    = makeUserRecord({ lastLogin: loginDate });
    mockRepo.findAll.mockResolvedValueOnce([record] as never);

    const result = await useCase.execute();
    expect(result.users[0]!.lastLogin).toBe(loginDate);
  });

  it('should preserve null fullName', async () => {
    const record = makeUserRecord({ fullName: null });
    mockRepo.findAll.mockResolvedValueOnce([record] as never);

    const result = await useCase.execute();
    expect(result.users[0]!.fullName).toBeNull();
  });


  it('should return { users: [], total: 0 } when the repository has no users', async () => {
    mockRepo.findAll.mockResolvedValueOnce([] as never);
    const result = await useCase.execute();
    expect(result.users).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should return the correct total count for multiple records', async () => {
    const records = [
      makeUserRecord(),
      makeUserRecord({ id: 'user-2', username: 'bob' }),
      makeUserRecord({ id: 'user-3', username: 'carol' }),
    ];
    mockRepo.findAll.mockResolvedValueOnce(records as never);

    const result = await useCase.execute();
    expect(result.total).toBe(3);
  });

  it('should propagate repository errors without catching them', async () => {
    mockRepo.findAll.mockRejectedValueOnce(new Error('DB error') as never);
    await expect(useCase.execute()).rejects.toThrow('DB error');
  });

  it('should propagate non-Error rejections as-is', async () => {
    mockRepo.findAll.mockRejectedValueOnce('timeout' as never);
    await expect(useCase.execute()).rejects.toBe('timeout');
  });
});
