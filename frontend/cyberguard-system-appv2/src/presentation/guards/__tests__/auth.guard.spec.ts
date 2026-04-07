// Tipo de prueba: Integración
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { Router } from '@angular/router';
import { authGuard } from '../auth.guard';
import { AuthService } from '../../../core/infrastructure/services/auth.service';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});


describe('authGuard', () => {
  let mockAuthService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockAuthService = {
      isAuthenticated: vi.fn()
    };

    mockRouter = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('should allow access when user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when user is not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
  });
});
