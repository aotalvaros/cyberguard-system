// Tipo de prueba: Integración
import { describe, it, expect, vi, beforeEach} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { noAuthGuard } from '../no-auth.guard';
import { AuthService } from '../../../core/infrastructure/services/auth.service';


describe('noAuthGuard', () => {
  let mockAuthService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  const runGuard = () =>
    TestBed.runInInjectionContext(() =>
      noAuthGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )
    );

  beforeEach(() => {
    mockAuthService = { isAuthenticated: vi.fn() };
    mockRouter = { navigate: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  describe('cuando el usuario NO está autenticado', () => {
    beforeEach(() => mockAuthService.isAuthenticated.mockReturnValue(false));

    it('debe permitir acceso a /autenticacion (retorna true)', () => {
      expect(runGuard()).toBe(true);
    });

    it('no debe redirigir al dashboard', () => {
      runGuard();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('cuando el usuario SÍ está autenticado', () => {
    beforeEach(() => mockAuthService.isAuthenticated.mockReturnValue(true));

    it('debe bloquear acceso a /autenticacion (retorna false)', () => {
      expect(runGuard()).toBe(false);
    });

    it('debe redirigir al dashboard', () => {
      runGuard();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('no debe permitir que un usuario autenticado vea el formulario de login', () => {
      // Regresión del bug: usuario con token en localStorage navegando a /
      // era redirigido a /autenticacion pero podía ver el sidebar y navegar.
      // Con noAuthGuard, es redirigido directamente al dashboard.
      const result = runGuard();
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
