import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { UserManagementComponent } from '../user-management.component';
import { GetUsersUseCase } from '../../../../core/application/use-cases/get-users.use-case';
import { CreateUserAdminUseCase } from '../../../../core/application/use-cases/create-user-admin.use-case';
import { UpdateUserAdminUseCase } from '../../../../core/application/use-cases/update-user-admin.use-case';
import { ToggleUserStatusUseCase } from '../../../../core/application/use-cases/toggle-user-status.use-case';
import { GetCurrentUserUseCase } from '../../../../core/application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../../../core/application/use-cases/logout.use-case';
import { AppErrorType } from '../../../../core/infrastructure/handlers/global-error.handler';

const adminUser = { username: 'admin', role: 'admin' };

const mockUserItem = {
  id: 'u1', uid: 'firebase-u1', username: 'testuser',
  email: 'test@example.com', fullName: 'Test User',
  role: 'soc_analyst', isActive: true,
  createdAt: '2026-01-01', updatedAt: '2026-01-01',
};

const makeAppError = (message: string, type = AppErrorType.SERVER) => ({
  type,
  message,
  statusCode: 500,
  timestamp: new Date(),
});

async function buildFixture(overrides: {
  getUsersResult?: ReturnType<typeof vi.fn>;
} = {}): Promise<ComponentFixture<UserManagementComponent>> {
  const getUsersMock = overrides.getUsersResult
    ?? vi.fn().mockReturnValue(of({ users: [mockUserItem], total: 1 }));

  await TestBed.configureTestingModule({
    imports: [UserManagementComponent],
    providers: [
      { provide: GetUsersUseCase,         useValue: { execute: getUsersMock } },
      { provide: CreateUserAdminUseCase,  useValue: { execute: vi.fn().mockReturnValue(of({ success: true, user: mockUserItem })) } },
      { provide: UpdateUserAdminUseCase,  useValue: { execute: vi.fn().mockReturnValue(of({ success: true, user: mockUserItem })) } },
      { provide: ToggleUserStatusUseCase, useValue: { execute: vi.fn().mockReturnValue(of({ success: true, user: mockUserItem, reassignedIncidents: 0 })) } },
      { provide: GetCurrentUserUseCase,   useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
      { provide: LogoutUseCase,           useValue: { execute: vi.fn() } },
      { provide: Router,                  useValue: { navigate: vi.fn() } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(UserManagementComponent);
  fixture.detectChanges();
  return fixture;
}

describe('UserManagementComponent', () => {

  describe('loadUsers — success', () => {
    let fixture: ComponentFixture<UserManagementComponent>;
    let component: UserManagementComponent;

    beforeEach(async () => {
      fixture   = await buildFixture();
      component = fixture.componentInstance;
    });

    it('should set loading to false after data arrives', () => {
      expect(component.loading).toBe(false);
    });

    it('should populate users array', () => {
      expect(component.users).toHaveLength(1);
      expect(component.users[0].username).toBe('testuser');
    });

    it('should set total count', () => {
      expect(component.total).toBe(1);
    });

    it('should clear error on success', () => {
      expect(component.error).toBe('');
    });
  });

  describe('loadUsers — error with AppError.message', () => {
    let component: UserManagementComponent;

    beforeEach(async () => {
      const errMock = vi.fn().mockReturnValue(throwError(() => makeAppError('Server error. Please try again later.')));
      const fixture = await buildFixture({ getUsersResult: errMock });
      component = fixture.componentInstance;
    });

    it('should set loading to false after error', () => {
      expect(component.loading).toBe(false);
    });

    it('should display AppError message', () => {
      expect(component.error).toBe('Server error. Please try again later.');
    });

    it('should have empty users array on error', () => {
      expect(component.users).toHaveLength(0);
    });
  });

  describe('loadUsers — error without message field', () => {
    let component: UserManagementComponent;

    beforeEach(async () => {
      const errMock = vi.fn().mockReturnValue(throwError(() => ({ statusCode: 500 })));
      const fixture = await buildFixture({ getUsersResult: errMock });
      component = fixture.componentInstance;
    });

    it('should use fallback message when error has no message', () => {
      expect(component.error).toBe('Error al cargar usuarios');
    });
  });

  describe('loadUsers — network AppError (status 0)', () => {
    let component: UserManagementComponent;

    beforeEach(async () => {
      const errMock = vi.fn().mockReturnValue(
        throwError(() => makeAppError('Unable to connect to the server. Please check your internet connection.', AppErrorType.NETWORK))
      );
      const fixture = await buildFixture({ getUsersResult: errMock });
      component = fixture.componentInstance;
    });

    it('should show network error message from AppError', () => {
      expect(component.error).toBe('Unable to connect to the server. Please check your internet connection.');
    });

    it('should set loading to false on network error', () => {
      expect(component.loading).toBe(false);
    });
  });

  describe('navigation helpers', () => {
    let component: UserManagementComponent;
    let mockRouter: { navigate: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
      mockRouter = { navigate: vi.fn() };
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,         useValue: { execute: vi.fn().mockReturnValue(of({ users: [], total: 0 })) } },
          { provide: CreateUserAdminUseCase,  useValue: { execute: vi.fn() } },
          { provide: UpdateUserAdminUseCase,  useValue: { execute: vi.fn() } },
          { provide: ToggleUserStatusUseCase, useValue: { execute: vi.fn() } },
          { provide: GetCurrentUserUseCase,   useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,           useValue: { execute: vi.fn() } },
          { provide: Router,                  useValue: mockRouter },
        ],
      }).compileComponents();
      component = TestBed.createComponent(UserManagementComponent).componentInstance;
    });

    it('should navigate to /dashboard', () => {
      component.goToDashboard();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should navigate to /incidents', () => {
      component.goToIncidents();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/incidents']);
    });

    it('should navigate to /autenticacion on logout', () => {
      component.logout();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
    });
  });

  describe('getRoleLabel', () => {
    let component: UserManagementComponent;

    beforeEach(async () => {
      const fixture = await buildFixture();
      component = fixture.componentInstance;
    });

    it('should return Administrador for admin', () => {
      expect(component.getRoleLabel('admin')).toBe('Administrador');
    });

    it('should return Analista SOC for soc_analyst', () => {
      expect(component.getRoleLabel('soc_analyst')).toBe('Analista SOC');
    });

    it('should return Gestor de Incidentes for incident_handler', () => {
      expect(component.getRoleLabel('incident_handler')).toBe('Gestor de Incidentes');
    });

    it('should return Gerente de Incidentes for incident_manager', () => {
      expect(component.getRoleLabel('incident_manager')).toBe('Gerente de Incidentes');
    });

    it('should return CISO for ciso', () => {
      expect(component.getRoleLabel('ciso')).toBe('CISO');
    });

    it('should return raw value for unknown role', () => {
      expect(component.getRoleLabel('unknown_role')).toBe('unknown_role');
    });
  });
});
