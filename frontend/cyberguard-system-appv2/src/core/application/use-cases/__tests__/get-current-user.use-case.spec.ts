// Tipo de prueba: Unitario
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { GetCurrentUserUseCase } from '../get-current-user.use-case';
import { AuthRepository } from '../../../domain/ports/auth.repository';

describe('GetCurrentUserUseCase', () => {
  let useCase: GetCurrentUserUseCase;
  let mockAuthRepository: Partial<AuthRepository>;

  beforeEach(() => {
    mockAuthRepository = {
      getUser: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        GetCurrentUserUseCase,
        { provide: AuthRepository, useValue: mockAuthRepository },
      ],
    });

    useCase = TestBed.inject(GetCurrentUserUseCase);
  });

  it('should return current user', () => {
    const user = { username: 'admin', role: 'admin' };
    mockAuthRepository.getUser = vi.fn().mockReturnValue(user);

    const result = useCase.execute();
    expect(result).toEqual(user);
  });

  it('should return true if user is admin', () => {
    mockAuthRepository.getUser = vi.fn().mockReturnValue({ username: 'admin', role: 'admin' });
    expect(useCase.isAdmin()).toBe(true);
  });

  it('should return false if user is not admin', () => {
    mockAuthRepository.getUser = vi.fn().mockReturnValue({ username: 'user', role: 'user' });
    expect(useCase.isAdmin()).toBe(false);
  });
});
