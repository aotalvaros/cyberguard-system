import { describe, it, expect, vi, beforeEach} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { GetUsersUseCase } from '../get-users.use-case';
import { UserAdminRepository } from '../../../domain/ports/user-admin.repository';
import { UserAdminList } from '../../../domain/models/user-admin.model';


describe('GetUsersUseCase', () => {
  let useCase: GetUsersUseCase;
  let mockRepository: { getUsers: ReturnType<typeof vi.fn> };

  const mockUserList: UserAdminList = {
    users: [
      { id: 'u1', uid: 'uid1', username: 'alice', email: 'alice@test.com', fullName: 'Alice', role: 'admin', isActive: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'u2', uid: 'uid2', username: 'bob',   email: 'bob@test.com',   fullName: 'Bob',   role: 'soc_analyst', isActive: false, createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
    ],
    total: 2,
  };

  beforeEach(() => {
    mockRepository = { getUsers: vi.fn().mockReturnValue(of(mockUserList)) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        GetUsersUseCase,
        { provide: UserAdminRepository, useValue: mockRepository },
      ],
    });

    useCase = TestBed.inject(GetUsersUseCase);
  });

  it('should return the user list from the repository', async () => {
    const result = await firstValueFrom(useCase.execute());

    expect(result.total).toBe(2);
    expect(result.users).toHaveLength(2);
    expect(result.users[0].username).toBe('alice');
    expect(mockRepository.getUsers).toHaveBeenCalledTimes(1);
  });

  it('should return empty list when no users exist', async () => {
    mockRepository.getUsers.mockReturnValue(of({ users: [], total: 0 }));

    const result = await firstValueFrom(useCase.execute());

    expect(result.total).toBe(0);
    expect(result.users).toHaveLength(0);
  });

  it('should delegate directly to UserAdminRepository.getUsers()', async () => {
    await firstValueFrom(useCase.execute());

    expect(mockRepository.getUsers).toHaveBeenCalledWith();
  });
});
