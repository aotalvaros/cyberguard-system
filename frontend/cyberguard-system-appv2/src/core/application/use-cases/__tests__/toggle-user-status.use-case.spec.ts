import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { ToggleUserStatusUseCase } from '../toggle-user-status.use-case';
import { UserAdminRepository } from '../../../domain/ports/user-admin.repository';
import { UserAdminItem } from '../../../domain/models/user-admin.model';

describe('ToggleUserStatusUseCase', () => {
  let useCase: ToggleUserStatusUseCase;
  let mockRepository: { toggleUserStatus: ReturnType<typeof vi.fn> };

  const userId = 'u-target';

  const deactivatedUser: UserAdminItem = {
    id: userId, uid: 'uid-t', username: 'charlie', email: 'charlie@test.com',
    fullName: 'Charlie', role: 'soc_analyst', isActive: false,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-04-02T13:00:00Z',
  };

  beforeEach(() => {
    mockRepository = {
      toggleUserStatus: vi.fn().mockReturnValue(of({ success: true, user: deactivatedUser, reassignedIncidents: 0 })),
    };

    TestBed.configureTestingModule({
      providers: [
        ToggleUserStatusUseCase,
        { provide: UserAdminRepository, useValue: mockRepository },
      ],
    });

    useCase = TestBed.inject(ToggleUserStatusUseCase);
  });

  it('should deactivate user and return response', async () => {
    const result = await firstValueFrom(useCase.execute(userId, false));

    expect(result.success).toBe(true);
    expect(result.user.isActive).toBe(false);
    expect(result.reassignedIncidents).toBe(0);
  });

  it('should call repository with isActive=false when deactivating', async () => {
    await firstValueFrom(useCase.execute(userId, false));

    expect(mockRepository.toggleUserStatus).toHaveBeenCalledWith(userId, { isActive: false });
  });

  it('should return reassignedIncidents count when user has active incidents', async () => {
    mockRepository.toggleUserStatus.mockReturnValue(
      of({ success: true, user: deactivatedUser, reassignedIncidents: 3 })
    );

    const result = await firstValueFrom(useCase.execute(userId, false));

    expect(result.reassignedIncidents).toBe(3);
  });

  it('should call repository with isActive=true when activating', async () => {
    const activatedUser = { ...deactivatedUser, isActive: true };
    mockRepository.toggleUserStatus.mockReturnValue(
      of({ success: true, user: activatedUser, reassignedIncidents: 0 })
    );

    const result = await firstValueFrom(useCase.execute(userId, true));

    expect(result.user.isActive).toBe(true);
    expect(mockRepository.toggleUserStatus).toHaveBeenCalledWith(userId, { isActive: true });
  });
});
