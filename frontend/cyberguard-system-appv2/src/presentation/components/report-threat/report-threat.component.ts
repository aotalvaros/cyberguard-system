import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportThreatUseCase } from '../../../core/application/use-cases/report-threat.use-case';
import { ThreatValidationFactory } from '../../../shared/factories/threat-validation.factory';
import { ThreatType } from '../../../core/domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../core/domain/models/threat-severity.enum';
import { ThreatRequest } from '../../../core/domain/models/threat-request.model';

@Component({
  selector: 'app-report-threat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './report-threat.component.html',
  styleUrl: './report-threat.component.css',
})
export class ReportThreatComponent {
  private fb = inject(FormBuilder);
  private reportThreatUseCase = inject(ReportThreatUseCase);
  private validationFactory = inject(ThreatValidationFactory);
  private router = inject(Router);

  ThreatType = ThreatType;
  ThreatSeverity = ThreatSeverity;

  threatTypes = Object.values(ThreatType);
  severityLevels = Object.values(ThreatSeverity);

  threatForm: FormGroup;
  loading = signal(false);
  validationErrors = signal<string[]>([]);
  success = signal('');
  error = signal('');

  constructor() {
    this.threatForm = this.fb.group({
      type:        [ThreatType.MALWARE,    Validators.required],
      severity:    [ThreatSeverity.MEDIUM, Validators.required],
      sourceIp:    ['', [Validators.required, this.ipValidator]],
      targetIp:    ['', [this.ipValidator]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });
  }

  ipValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    return ipv4.test(control.value) ? null : { ip: true };
  }

  onSubmit(): void {
    if (this.threatForm.invalid) return;

    const formValue = this.threatForm.value;
    const threat: ThreatRequest = {
      type:        formValue.type        as ThreatType,
      severity:    formValue.severity    as ThreatSeverity,
      sourceIp:    formValue.sourceIp!,
      targetIp:    formValue.targetIp || undefined,
      description: formValue.description!,
    };

    const validator = this.validationFactory.createValidator(threat.type);
    const validation = validator.validate(threat);

    if (!validation.valid) {
      this.validationErrors.set(validation.errors);
      return;
    }

    this.validationErrors.set([]);
    this.error.set('');
    this.success.set('');
    this.loading.set(true);

    this.reportThreatUseCase.execute(threat).subscribe({
      next: (response) => {
        this.success.set(`Amenaza reportada exitosamente. ID: ${response.threatId}`);
        this.threatForm.reset({ type: ThreatType.MALWARE, severity: ThreatSeverity.MEDIUM });
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      },
      error: (err) => {
        this.error.set(err.error?.error || err.error?.message || 'Error al reportar amenaza');
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
