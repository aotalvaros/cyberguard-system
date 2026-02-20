import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LoginUseCase } from '../login.use-case';
import { AuthRepository } from '../../../domain/ports/auth.repository';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockAuthRepository: Partial<AuthRepository>;

  beforeEach(() => {
    mockAuthRepository = {
      login: vi.fn(),
      saveToken: vi.fn(),
      saveUser: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        LoginUseCase,
        { provide: AuthRepository, useValue: mockAuthRepository },
      ],
    });

    useCase = TestBed.inject(LoginUseCase);
  });

  it('should login and save credentials', () => {
    const credentials = { username: 'admin', password: 'cyberguard2024' };
    const response = { token: 'test-token', user: { username: 'admin', role: 'admin' } };

    mockAuthRepository.login = vi.fn().mockReturnValue(of(response));

    useCase.execute(credentials).subscribe((result) => {
      expect(result).toEqual(response);
      expect(mockAuthRepository.saveToken).toHaveBeenCalledWith('test-token');
      expect(mockAuthRepository.saveUser).toHaveBeenCalledWith(response.user);
    });
  });
});
