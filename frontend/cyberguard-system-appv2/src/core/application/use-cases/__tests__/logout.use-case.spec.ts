import { describe, it, expect, beforeEach, vi } from 'vitest';
// Tipo de prueba: Unitario
import { TestBed } from '@angular/core/testing';
import { LogoutUseCase } from '../logout.use-case';
import { AuthRepository } from '../../../domain/ports/auth.repository';


describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let mockAuthRepository: Partial<AuthRepository>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockAuthRepository = {
      clearAuth: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        LogoutUseCase,
        { provide: AuthRepository, useValue: mockAuthRepository },
      ],
    });

    useCase = TestBed.inject(LogoutUseCase);
  });

  it('should clear authentication', () => {
    useCase.execute();
    expect(mockAuthRepository.clearAuth).toHaveBeenCalled();
  });
});
