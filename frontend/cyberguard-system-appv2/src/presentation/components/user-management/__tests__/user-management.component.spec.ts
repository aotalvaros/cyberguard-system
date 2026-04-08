import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
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

  TestBed.resetTestingModule();
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
      TestBed.resetTestingModule();
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

  // ─────────────────────────────────────────────────────────
  // toggleCreateForm
  // ─────────────────────────────────────────────────────────
  describe('toggleCreateForm', () => {
    let fixture: ComponentFixture<UserManagementComponent>;
    let component: UserManagementComponent;

    beforeEach(async () => {
      fixture   = await buildFixture();
      component = fixture.componentInstance;
    });

    it('should show the form on first call', () => {
      component.toggleCreateForm();
      expect(component.showCreateForm).toBe(true);
    });

    it('should hide the form on second call', () => {
      component.toggleCreateForm();
      component.toggleCreateForm();
      expect(component.showCreateForm).toBe(false);
    });

    it('should reset email field on toggle', () => {
      component.createForm.patchValue({ email: 'test@example.com' });
      component.toggleCreateForm();
      // Angular reactive form reset() sets string controls to null
      expect(component.createForm.value.email).toBeNull();
    });

    it('should clear error and success messages', () => {
      component.error   = 'some error';
      component.success = 'some success';
      component.toggleCreateForm();
      expect(component.error).toBe('');
      expect(component.success).toBe('');
    });

    it('should reset role to soc_analyst on toggle', () => {
      component.createForm.patchValue({ role: 'admin' });
      component.toggleCreateForm();
      expect(component.createForm.value.role).toBe('soc_analyst');
    });
  });

  // ─────────────────────────────────────────────────────────
  // onCreateUser
  // ─────────────────────────────────────────────────────────
  describe('onCreateUser — invalid form', () => {
    it('should not call use case when form is invalid', async () => {
      const createMock = vi.fn();
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,         useValue: { execute: vi.fn().mockReturnValue(of({ users: [], total: 0 })) } },
          { provide: CreateUserAdminUseCase,  useValue: { execute: createMock } },
          { provide: UpdateUserAdminUseCase,  useValue: { execute: vi.fn() } },
          { provide: ToggleUserStatusUseCase, useValue: { execute: vi.fn() } },
          { provide: GetCurrentUserUseCase,   useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,           useValue: { execute: vi.fn() } },
          { provide: Router,                  useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      comp.onCreateUser();
      expect(createMock).not.toHaveBeenCalled();
    });
  });

  describe('onCreateUser — success', () => {
    let component: UserManagementComponent;

    beforeEach(async () => {
      const fixture = await buildFixture();
      component = fixture.componentInstance;
    });

    it('should set success message with username after create', () => {
      component.createForm.patchValue({
        email: 'nuevo@test.com', fullName: 'Nuevo Usuario',
        username: 'testuser', role: 'soc_analyst',
      });
      component.onCreateUser();
      expect(component.success).toContain('testuser');
    });

    it('should hide form after successful creation', () => {
      component.showCreateForm = true;
      component.createForm.patchValue({
        email: 'nuevo@test.com', fullName: 'Nuevo Usuario',
        username: 'testuser', role: 'soc_analyst',
      });
      component.onCreateUser();
      expect(component.showCreateForm).toBe(false);
    });

    it('should set creating to false after success', () => {
      component.createForm.patchValue({
        email: 'nuevo@test.com', fullName: 'Nuevo Usuario',
        username: 'testuser', role: 'soc_analyst',
      });
      component.onCreateUser();
      expect(component.creating).toBe(false);
    });
  });

  describe('onCreateUser — error', () => {
    it('should set error message on failure', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,        useValue: { execute: vi.fn().mockReturnValue(of({ users: [], total: 0 })) } },
          { provide: CreateUserAdminUseCase, useValue: { execute: vi.fn().mockReturnValue(throwError(() => ({ message: 'Email ya registrado' }))) } },
          { provide: UpdateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: ToggleUserStatusUseCase,useValue: { execute: vi.fn() } },
          { provide: GetCurrentUserUseCase,  useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,          useValue: { execute: vi.fn() } },
          { provide: Router,                 useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      comp.createForm.patchValue({ email: 'dup@test.com', fullName: 'Dup User', username: 'dupuser', role: 'soc_analyst' });
      comp.onCreateUser();
      expect(comp.error).toBe('Email ya registrado');
      expect(comp.creating).toBe(false);
    });

    it('should use fallback error message when no message provided', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,        useValue: { execute: vi.fn().mockReturnValue(of({ users: [], total: 0 })) } },
          { provide: CreateUserAdminUseCase, useValue: { execute: vi.fn().mockReturnValue(throwError(() => ({}))) } },
          { provide: UpdateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: ToggleUserStatusUseCase,useValue: { execute: vi.fn() } },
          { provide: GetCurrentUserUseCase,  useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,          useValue: { execute: vi.fn() } },
          { provide: Router,                 useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      comp.createForm.patchValue({ email: 'x@test.com', fullName: 'X User', username: 'xuser', role: 'soc_analyst' });
      comp.onCreateUser();
      expect(comp.error).toBe('Error al crear usuario');
    });
  });

  // ─────────────────────────────────────────────────────────
  // startEdit / cancelEdit / onUpdateUser
  // ─────────────────────────────────────────────────────────
  describe('startEdit / cancelEdit', () => {
    let fixture: ComponentFixture<UserManagementComponent>;
    let component: UserManagementComponent;

    beforeEach(async () => {
      fixture   = await buildFixture();
      component = fixture.componentInstance;
    });

    it('should set editingUserId on startEdit', () => {
      component.startEdit(mockUserItem);
      expect(component.editingUserId).toBe('u1');
    });

    it('should patch editForm with user data on startEdit', () => {
      component.startEdit(mockUserItem);
      expect(component.editForm.value.role).toBe('soc_analyst');
      expect(component.editForm.value.fullName).toBe('Test User');
    });

    it('should clear error and success on startEdit', () => {
      component.error   = 'prev error';
      component.success = 'prev success';
      component.startEdit(mockUserItem);
      expect(component.error).toBe('');
      expect(component.success).toBe('');
    });

    it('should set editingUserId to null on cancelEdit', () => {
      component.editingUserId = 'u1';
      component.cancelEdit();
      expect(component.editingUserId).toBeNull();
    });
  });

  describe('onUpdateUser — invalid form', () => {
    it('should not call use case when editForm is invalid', async () => {
      const updateMock = vi.fn();
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,        useValue: { execute: vi.fn().mockReturnValue(of({ users: [], total: 0 })) } },
          { provide: CreateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: UpdateUserAdminUseCase, useValue: { execute: updateMock } },
          { provide: ToggleUserStatusUseCase,useValue: { execute: vi.fn() } },
          { provide: GetCurrentUserUseCase,  useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,          useValue: { execute: vi.fn() } },
          { provide: Router,                 useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      // editForm has role = '' → invalid (Validators.required)
      comp.editForm.patchValue({ fullName: 'New Name', role: '' });
      comp.onUpdateUser('u1');
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('onUpdateUser — success', () => {
    let component: UserManagementComponent;

    beforeEach(async () => {
      const fixture = await buildFixture();
      component = fixture.componentInstance;
    });

    it('should set success message with username after update', () => {
      component.editForm.patchValue({ fullName: 'Updated Name', role: 'admin' });
      component.onUpdateUser('u1');
      expect(component.success).toContain('testuser');
    });

    it('should clear editingUserId after successful update', () => {
      component.editingUserId = 'u1';
      component.editForm.patchValue({ fullName: 'Updated Name', role: 'admin' });
      component.onUpdateUser('u1');
      expect(component.editingUserId).toBeNull();
    });

    it('should set updating to false after success', () => {
      component.editForm.patchValue({ fullName: 'Updated Name', role: 'admin' });
      component.onUpdateUser('u1');
      expect(component.updating).toBe(false);
    });
  });

  describe('onUpdateUser — error', () => {
    it('should set error message on update failure', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,        useValue: { execute: vi.fn().mockReturnValue(of({ users: [], total: 0 })) } },
          { provide: CreateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: UpdateUserAdminUseCase, useValue: { execute: vi.fn().mockReturnValue(throwError(() => ({ message: 'Usuario no encontrado' }))) } },
          { provide: ToggleUserStatusUseCase,useValue: { execute: vi.fn() } },
          { provide: GetCurrentUserUseCase,  useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,          useValue: { execute: vi.fn() } },
          { provide: Router,                 useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      comp.editForm.patchValue({ fullName: 'Name', role: 'admin' });
      comp.onUpdateUser('u1');
      expect(comp.error).toBe('Usuario no encontrado');
      expect(comp.updating).toBe(false);
    });

    it('should use fallback message when no error message', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,        useValue: { execute: vi.fn().mockReturnValue(of({ users: [], total: 0 })) } },
          { provide: CreateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: UpdateUserAdminUseCase, useValue: { execute: vi.fn().mockReturnValue(throwError(() => ({}))) } },
          { provide: ToggleUserStatusUseCase,useValue: { execute: vi.fn() } },
          { provide: GetCurrentUserUseCase,  useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,          useValue: { execute: vi.fn() } },
          { provide: Router,                 useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      comp.editForm.patchValue({ fullName: 'Name', role: 'admin' });
      comp.onUpdateUser('u1');
      expect(comp.error).toBe('Error al actualizar usuario');
    });
  });

  // ─────────────────────────────────────────────────────────
  // onToggleStatus
  // ─────────────────────────────────────────────────────────
  describe('onToggleStatus — confirm denied', () => {
    it('should not call use case when user cancels confirm', async () => {
      const toggleMock = vi.fn();
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,        useValue: { execute: vi.fn().mockReturnValue(of({ users: [mockUserItem], total: 1 })) } },
          { provide: CreateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: UpdateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: ToggleUserStatusUseCase,useValue: { execute: toggleMock } },
          { provide: GetCurrentUserUseCase,  useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,          useValue: { execute: vi.fn() } },
          { provide: Router,                 useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      comp.onToggleStatus(mockUserItem);
      expect(toggleMock).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe('onToggleStatus — success (deactivate without reassignment)', () => {
    let component: UserManagementComponent;

    beforeEach(async () => {
      const fixture = await buildFixture();
      component = fixture.componentInstance;
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should call toggleUserStatusUseCase with inverted status', () => {
      component.onToggleStatus(mockUserItem);
      expect(component.success).toContain('desactivado');
    });

    it('should set success message without reassignment note when count is 0', () => {
      component.onToggleStatus(mockUserItem);
      expect(component.success).not.toContain('incidentes reasignados');
    });
  });

  describe('onToggleStatus — success with reassignment', () => {
    it('should include reassignment count in success message', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,        useValue: { execute: vi.fn().mockReturnValue(of({ users: [mockUserItem], total: 1 })) } },
          { provide: CreateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: UpdateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: ToggleUserStatusUseCase,useValue: { execute: vi.fn().mockReturnValue(of({ success: true, user: mockUserItem, reassignedIncidents: 3 })) } },
          { provide: GetCurrentUserUseCase,  useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,          useValue: { execute: vi.fn() } },
          { provide: Router,                 useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      comp.onToggleStatus(mockUserItem);
      expect(comp.success).toContain('3 incidentes reasignados');
      vi.restoreAllMocks();
    });
  });

  describe('onToggleStatus — error', () => {
    it('should set error on toggle failure', async () => {
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [UserManagementComponent],
        providers: [
          { provide: GetUsersUseCase,        useValue: { execute: vi.fn().mockReturnValue(of({ users: [mockUserItem], total: 1 })) } },
          { provide: CreateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: UpdateUserAdminUseCase, useValue: { execute: vi.fn() } },
          { provide: ToggleUserStatusUseCase,useValue: { execute: vi.fn().mockReturnValue(throwError(() => ({ message: 'No se puede desactivar' }))) } },
          { provide: GetCurrentUserUseCase,  useValue: { execute: vi.fn().mockReturnValue(adminUser) } },
          { provide: LogoutUseCase,          useValue: { execute: vi.fn() } },
          { provide: Router,                 useValue: { navigate: vi.fn() } },
        ],
      }).compileComponents();
      const comp = TestBed.createComponent(UserManagementComponent).componentInstance;
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      comp.onToggleStatus(mockUserItem);
      expect(comp.error).toBe('No se puede desactivar');
      vi.restoreAllMocks();
    });
  });

  // ─────────────────────────────────────────────────────────
  // trackByUserId
  // ─────────────────────────────────────────────────────────
  describe('trackByUserId', () => {
    let component: UserManagementComponent;

    beforeEach(async () => {
      const fixture = await buildFixture();
      component = fixture.componentInstance;
    });

    it('should return the user id', () => {
      expect(component.trackByUserId(0, mockUserItem)).toBe('u1');
    });

    it('should return the correct id for different indices', () => {
      const user2 = { ...mockUserItem, id: 'u2' };
      expect(component.trackByUserId(1, user2)).toBe('u2');
    });
  });
});
