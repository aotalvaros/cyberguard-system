import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { adminGuard } from './admin.guard';
import { AuthService } from '../services/auth.service';

describe('adminGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['isAdmin']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('should allow access for admin users', () => {
    mockAuthService.isAdmin.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should deny access for non-admin users', () => {
    mockAuthService.isAdmin.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
  });

  it('should redirect to login when not authenticated', () => {
    mockAuthService.isAdmin.and.returnValue(false);

    TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
  });

  it('should check admin status before navigation', () => {
    mockAuthService.isAdmin.and.returnValue(true);

    TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));

    expect(mockAuthService.isAdmin).toHaveBeenCalled();
  });

  it('should handle multiple guard checks', () => {
    mockAuthService.isAdmin.and.returnValues(true, false, true);

    const result1 = TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));
    const result2 = TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));
    const result3 = TestBed.runInInjectionContext(() => adminGuard(null as any, null as any));

    expect(result1).toBe(true);
    expect(result2).toBe(false);
    expect(result3).toBe(true);
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
  });
});
