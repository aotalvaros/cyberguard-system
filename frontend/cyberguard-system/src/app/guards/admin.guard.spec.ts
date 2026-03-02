// Tipo de prueba: Integración
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'getCurrentUser']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AdminGuard,
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    guard = TestBed.inject(AdminGuard);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  describe('canActivate', () => {
    it('should allow access for authenticated admin user', () => {
      const mockUser = { username: 'admin', role: 'admin' };
      authService.isAuthenticated.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);

      const result = guard.canActivate();

      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      authService.isAuthenticated.and.returnValue(false);
      authService.getCurrentUser.and.returnValue(null);

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('should deny access for authenticated user without admin role', () => {
      const mockUser = { username: 'user', role: 'user' };
      authService.isAuthenticated.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('should deny access when user data is null despite being authenticated', () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(null);

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('should handle users with undefined role', () => {
      const mockUser = { username: 'admin' }; // No role property
      authService.isAuthenticated.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser as any);

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('should handle case-sensitive role validation', () => {
      const mockUser = { username: 'admin', role: 'ADMIN' }; // Uppercase
      authService.isAuthenticated.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);

      const result = guard.canActivate();

      expect(result).toBe(false); // Should be case-sensitive
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });

    it('should handle empty string role', () => {
      const mockUser = { username: 'admin', role: '' };
      authService.isAuthenticated.and.returnValue(true);
      authService.getCurrentUser.and.returnValue(mockUser);

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });
  });

  describe('edge cases', () => {
    it('should handle AuthService throwing exception', () => {
      authService.isAuthenticated.and.throwError('Service error');

      expect(() => guard.canActivate()).toThrow();
    });

    it('should handle malformed user object', () => {
      authService.isAuthenticated.and.returnValue(true);
      authService.getCurrentUser.and.returnValue({} as any); // Empty object

      const result = guard.canActivate();

      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth']);
    });
  });
});