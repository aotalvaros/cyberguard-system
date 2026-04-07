import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { GetIncidentsUseCase } from '../../../core/application/use-cases/get-incidents.use-case';
import { CreateIncidentUseCase } from '../../../core/application/use-cases/create-incident.use-case';
import { GetCurrentUserUseCase } from '../../../core/application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../../core/application/use-cases/logout.use-case';
import { IncidentItem } from '../../../core/domain/models/incident.model';

@Component({
  selector: 'app-incident-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './incident-list.component.html',
  styleUrl: './incident-list.component.css',
})
export class IncidentListComponent implements OnInit {
  private getIncidentsUseCase    = inject(GetIncidentsUseCase);
  private createIncidentUseCase  = inject(CreateIncidentUseCase);
  private getCurrentUserUseCase  = inject(GetCurrentUserUseCase);
  private logoutUseCase          = inject(LogoutUseCase);
  private router                 = inject(Router);
  private fb                     = inject(FormBuilder);
  private cdr                    = inject(ChangeDetectorRef);

  currentUser = this.getCurrentUserUseCase.execute();

  incidents: IncidentItem[] = [];
  total      = 0;
  loading    = false;
  error      = '';
  success    = '';

  filterForm = this.fb.group({
    status:   [''],
    severity: [''],
  });

  showCreateForm = false;
  creating       = false;

  createForm = this.fb.group({
    threatId: ['', [Validators.required, Validators.pattern(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )]],
  });

  readonly statusOptions   = ['', 'open', 'classified', 'assigned', 'in_containment', 'in_eradication', 'in_recovery', 'resolved', 'closed', 'escalated'];
  readonly severityOptions = ['', 'low', 'medium', 'high', 'critical'];

  readonly statusLabels: Record<string, string> = {
    open: 'Abierto',
    classified: 'Clasificado',
    assigned: 'Asignado',
    in_containment: 'En Contención',
    in_eradication: 'En Erradicación',
    in_recovery: 'En Recuperación',
    resolved: 'Resuelto',
    closed: 'Cerrado',
    escalated: 'Escalado',
  };

  readonly severityLabels: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
  };

  readonly roleLabels: Record<string, string> = {
    admin: 'Administrador',
    soc_analyst: 'Analista SOC',
    incident_handler: 'Gestor de Incidentes',
    incident_manager: 'Gerente de Incidentes',
    ciso: 'CISO',
  };

  getStatusLabel(status: string): string {
    return this.statusLabels[status] ?? status;
  }

  getSeverityLabel(severity: string): string {
    return this.severityLabels[severity] ?? severity;
  }

  getRoleLabel(role: string): string {
    return this.roleLabels[role] ?? role;
  }

  canCreate = (): boolean => ['admin', 'soc_analyst'].includes(this.currentUser?.role ?? '');

  ngOnInit(): void {
    this.loadIncidents();
  }

  loadIncidents(): void {
    this.loading = true;
    this.error   = '';

    const { status, severity } = this.filterForm.value;
    const filters: { status?: string; severity?: string } = {};
    if (status)   filters.status   = status;
    if (severity) filters.severity = severity;

    this.getIncidentsUseCase.execute(filters).subscribe({
      next: (res) => {
        this.incidents = res.incidents;
        this.total     = res.total;
        this.loading   = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.error   = err.message || err.error?.error || 'Error al cargar incidentes';
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    this.loadIncidents();
  }

  clearFilters(): void {
    this.filterForm.reset({ status: '', severity: '' });
    this.loadIncidents();
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.createForm.reset();
    this.success = '';
    this.error   = '';
  }

  onCreateIncident(): void {
    if (this.createForm.invalid) return;
    this.creating = true;
    this.error    = '';
    this.success  = '';

    this.createIncidentUseCase.execute({ threatId: this.createForm.value.threatId! }).subscribe({
      next: (res) => {
        this.creating       = false;
        this.showCreateForm = false;
        this.success        = `Incidente "${res.incident.title}" creado exitosamente (ID: ${res.incident.id})`;
        this.cdr.markForCheck();
        this.loadIncidents();
      },
      error: (err) => {
        this.creating = false;
        this.error    = err.message || err.error?.error || 'Error al crear incidente';
        this.cdr.markForCheck();
      },
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToUserManagement(): void {
    this.router.navigate(['/users']);
  }

  logout(): void {
    this.logoutUseCase.execute();
    this.router.navigate(['/autenticacion']);
  }

  getSeverityClass(severity: string): string {
    return `severity-${severity}`;
  }

  getStatusClass(status: string): string {
    return `status-${status.replace(/_/g, '-')}`;
  }

  trackByIncidentId(_: number, incident: IncidentItem): string {
    return incident.id;
  }
}
