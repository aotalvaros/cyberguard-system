import { describe, it, expect, vi, beforeEach, beforeAll} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { of, firstValueFrom } from 'rxjs';
import { UpdateUserAdminUseCase } from '../update-user-admin.use-case';
import { UserAdminRepository } from '../../../domain/ports/user-admin.repository';
import { UpdateUserAdminRequest } from '../../../domain/models/user-admin-request.model';
import { UserAdminItem } from '../../../domain/models/user-admin.model';


beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('UpdateUserAdminUseCase', () => {
  let useCase: UpdateUserAdminUseCase;
  let mockRepository: { updateUser: ReturnType<typeof vi.fn> };

  const userId = 'u-existing';

  const updatedUser: UserAdminItem = {
    id: userId, uid: 'uid-ex', username: 'bob', email: 'bob@test.com',
    fullName: 'Bob Updated', role: 'incident_handler', isActive: true,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-04-02T12:00:00Z',
  };

  const request: UpdateUserAdminRequest = { fullName: 'Bob Updated', role: 'incident_handler' };

  beforeEach(() => {
    mockRepository = { updateUser: vi.fn().mockReturnValue(of({ success: true, user: updatedUser })) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        UpdateUserAdminUseCase,
        { provide: UserAdminRepository, useValue: mockRepository },
      ],
    });

    useCase = TestBed.inject(UpdateUserAdminUseCase);
  });

  it('should update user and return updated record', async () => {
    const result = await firstValueFrom(useCase.execute(userId, request));

    expect(result.success).toBe(true);
    expect(result.user.fullName).toBe('Bob Updated');
    expect(result.user.role).toBe('incident_handler');
  });

  it('should call repository with correct id and request', async () => {
    await firstValueFrom(useCase.execute(userId, request));

    expect(mockRepository.updateUser).toHaveBeenCalledWith(userId, request);
  });

  it('should support partial update (role only)', async () => {
    const partialRequest: UpdateUserAdminRequest = { role: 'viewer' };
    mockRepository.updateUser.mockReturnValue(of({ success: true, user: { ...updatedUser, role: 'viewer' } }));

    const result = await firstValueFrom(useCase.execute(userId, partialRequest));

    expect(result.user.role).toBe('viewer');
    expect(mockRepository.updateUser).toHaveBeenCalledWith(userId, partialRequest);
  });
});
