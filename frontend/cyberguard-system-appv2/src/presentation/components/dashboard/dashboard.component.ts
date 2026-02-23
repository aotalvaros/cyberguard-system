import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ReportThreatUseCase } from '../../../core/application/use-cases/report-threat.use-case';
import { LogoutUseCase } from '../../../core/application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../../core/application/use-cases/get-current-user.use-case';
import { ThreatType } from '../../../core/domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../core/domain/models/threat-severity.enum';
import { ThreatRequest } from '../../../core/domain/models/threat-request.model';
import { AlertsComponent } from '../alerts/alerts.component';
import { StatisticsWidgetComponent } from './statistics-widget/statistics-widget.component';

// ⚠️ HUMAN CHECK:
// Dashboard refactorizado para usar Use Cases en lugar de servicios directos
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertsComponent, StatisticsWidgetComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private reportThreatUseCase = inject(ReportThreatUseCase);
  private logoutUseCase = inject(LogoutUseCase);
  private getCurrentUserUseCase = inject(GetCurrentUserUseCase);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  user = this.getCurrentUserUseCase.execute();

  threatTypes = Object.values(ThreatType);
  severityLevels = Object.values(ThreatSeverity);

  threatForm = this.fb.group({
    type: [ThreatType.MALWARE, Validators.required],
    severity: [ThreatSeverity.MEDIUM, Validators.required],
    sourceIp: ['', [Validators.required, this.ipValidator]],
    targetIp: ['', [this.ipValidator]],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
  });

  loading = false;
  success = '';
  error = '';

  ipValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    return ipv4.test(control.value) ? null : { ip: true };
  }

  onSubmit(): void {
    if (this.threatForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = '';

    const formValue = this.threatForm.value;
    const threat: ThreatRequest = {
      type: formValue.type as ThreatType,
      severity: formValue.severity as ThreatSeverity,
      sourceIp: formValue.sourceIp!,
      targetIp: formValue.targetIp || undefined,
      description: formValue.description!
    };

    this.reportThreatUseCase.execute(threat).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = `Amenaza reportada exitosamente. ID: ${response.threatId}`;
        this.threatForm.reset({
          type: ThreatType.MALWARE,
          severity: ThreatSeverity.MEDIUM
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || err.error?.message || 'Error al reportar amenaza';
      }
    });
  }

  logout(): void {
    this.logoutUseCase.execute();
    this.router.navigate(['/autenticacion']);
  }
}
