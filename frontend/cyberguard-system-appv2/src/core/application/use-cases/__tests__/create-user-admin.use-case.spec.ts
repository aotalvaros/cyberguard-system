import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { CreateUserAdminUseCase } from '../create-user-admin.use-case';
import { UserAdminRepository } from '../../../domain/ports/user-admin.repository';
import { CreateUserAdminRequest } from '../../../domain/models/user-admin-request.model';
import { UserAdminItem } from '../../../domain/models/user-admin.model';

describe('CreateUserAdminUseCase', () => {
  let useCase: CreateUserAdminUseCase;
  let mockRepository: { createUser: ReturnType<typeof vi.fn> };

  const newUser: UserAdminItem = {
    id: 'u-new', uid: 'uid-new', username: 'ana.torres', email: 'ana@test.com',
    fullName: 'Ana Torres', role: 'soc_analyst', isActive: true,
    createdAt: '2026-04-02T10:00:00Z', updatedAt: '2026-04-02T10:00:00Z',
  };

  const request: CreateUserAdminRequest = {
    email: 'ana@test.com', fullName: 'Ana Torres', username: 'ana.torres', role: 'soc_analyst',
  };

  beforeEach(() => {
    mockRepository = { createUser: vi.fn().mockReturnValue(of({ success: true, user: newUser })) };

    TestBed.configureTestingModule({
      providers: [
        CreateUserAdminUseCase,
        { provide: UserAdminRepository, useValue: mockRepository },
      ],
    });

    useCase = TestBed.inject(CreateUserAdminUseCase);
  });

  it('should create a user and return the created record', async () => {
    const result = await firstValueFrom(useCase.execute(request));

    expect(result.success).toBe(true);
    expect(result.user.username).toBe('ana.torres');
    expect(result.user.role).toBe('soc_analyst');
    expect(mockRepository.createUser).toHaveBeenCalledWith(request);
  });

  it('should forward the full request payload to the repository', async () => {
    await firstValueFrom(useCase.execute(request));

    expect(mockRepository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ana@test.com', fullName: 'Ana Torres' })
    );
  });
});
