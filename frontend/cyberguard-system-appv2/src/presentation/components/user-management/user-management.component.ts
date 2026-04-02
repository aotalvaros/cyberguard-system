import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GetUsersUseCase } from '../../../core/application/use-cases/get-users.use-case';
import { CreateUserAdminUseCase } from '../../../core/application/use-cases/create-user-admin.use-case';
import { UpdateUserAdminUseCase } from '../../../core/application/use-cases/update-user-admin.use-case';
import { ToggleUserStatusUseCase } from '../../../core/application/use-cases/toggle-user-status.use-case';
import { GetCurrentUserUseCase } from '../../../core/application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../../core/application/use-cases/logout.use-case';
import { UserAdminItem } from '../../../core/domain/models/user-admin.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
})
export class UserManagementComponent implements OnInit {
  private getUsersUseCase        = inject(GetUsersUseCase);
  private createUserAdminUseCase = inject(CreateUserAdminUseCase);
  private updateUserAdminUseCase = inject(UpdateUserAdminUseCase);
  private toggleUserStatusUseCase = inject(ToggleUserStatusUseCase);
  private getCurrentUserUseCase  = inject(GetCurrentUserUseCase);
  private logoutUseCase          = inject(LogoutUseCase);
  private router                 = inject(Router);
  private fb                     = inject(FormBuilder);
  private cdr                    = inject(ChangeDetectorRef);

  currentUser = this.getCurrentUserUseCase.execute();

  users:    UserAdminItem[] = [];
  total     = 0;
  loading   = false;
  error     = '';
  success   = '';

  showCreateForm = false;
  creating       = false;

  createForm = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    role:     ['soc_analyst', Validators.required],
  });

  editingUserId: string | null = null;
  updating = false;

  editForm = this.fb.group({
    fullName: ['', Validators.minLength(3)],
    role:     ['', Validators.required],
  });

  roles = ['admin', 'soc_analyst', 'incident_handler', 'incident_manager', 'ciso'];

  readonly roleLabels: Record<string, string> = {
    admin: 'Administrador',
    soc_analyst: 'Analista SOC',
    incident_handler: 'Gestor de Incidentes',
    incident_manager: 'Gerente de Incidentes',
    ciso: 'CISO',
  };

  getRoleLabel(role: string): string {
    return this.roleLabels[role] ?? role;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error   = '';
    this.getUsersUseCase.execute().subscribe({
      next: (res) => {
        this.users   = res.users;
        this.total   = res.total;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.error   = err.message || err.error?.error || 'Error al cargar usuarios';
        this.cdr.markForCheck();
      },
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.createForm.reset({ role: 'soc_analyst' });
    this.success = '';
    this.error   = '';
  }

  onCreateUser(): void {
    if (this.createForm.invalid) return;
    this.creating = true;
    this.error    = '';
    this.success  = '';

    this.createUserAdminUseCase.execute(this.createForm.value as any).subscribe({
      next: (res) => {
        this.creating       = false;
        this.showCreateForm = false;
        this.success        = `Usuario "${res.user.username}" creado exitosamente`;
        this.cdr.markForCheck();
        this.loadUsers();
      },
      error: (err) => {
        this.creating = false;
        this.error    = err.message || err.error?.error || 'Error al crear usuario';
        this.cdr.markForCheck();
      },
    });
  }

  startEdit(user: UserAdminItem): void {
    this.editingUserId = user.id;
    this.editForm.patchValue({ fullName: user.fullName ?? '', role: user.role });
    this.error   = '';
    this.success = '';
  }

  cancelEdit(): void {
    this.editingUserId = null;
  }

  onUpdateUser(userId: string): void {
    if (this.editForm.invalid) return;
    this.updating = true;
    this.error    = '';

    const { fullName, role } = this.editForm.value;
    this.updateUserAdminUseCase.execute(userId, { fullName: fullName || undefined, role: role || undefined }).subscribe({
      next: (res) => {
        this.updating      = false;
        this.editingUserId = null;
        this.success       = `Usuario "${res.user.username}" actualizado`;
        this.cdr.markForCheck();
        this.loadUsers();
      },
      error: (err) => {
        this.updating = false;
        this.error    = err.message || err.error?.error || 'Error al actualizar usuario';
        this.cdr.markForCheck();
      },
    });
  }

  onToggleStatus(user: UserAdminItem): void {
    const newStatus = !user.isActive;
    const action    = newStatus ? 'activar' : 'desactivar';
    if (!confirm(`¿Confirmas ${action} al usuario "${user.username}"?`)) return;

    this.error   = '';
    this.success = '';
    this.toggleUserStatusUseCase.execute(user.id, newStatus).subscribe({
      next: (res) => {
        const msg = res.reassignedIncidents > 0
          ? ` (${res.reassignedIncidents} incidentes reasignados)`
          : '';
        this.success = `Usuario "${res.user.username}" ${newStatus ? 'activado' : 'desactivado'}${msg}`;
        this.cdr.markForCheck();
        this.loadUsers();
      },
      error: (err) => {
        this.error = err.message || err.error?.error || 'Error al cambiar estado del usuario';
        this.cdr.markForCheck();
      },
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToIncidents(): void {
    this.router.navigate(['/incidents']);
  }

  logout(): void {
    this.logoutUseCase.execute();
    this.router.navigate(['/autenticacion']);
  }

  trackByUserId(_: number, user: UserAdminItem): string {
    return user.id;
  }
}
