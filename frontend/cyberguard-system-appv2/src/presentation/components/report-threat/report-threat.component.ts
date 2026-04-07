import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  template: `
    <div class="report-container">
      <h2>Report Security Threat</h2>
      
      <form [formGroup]="threatForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label>Threat Type *</label>
          <select formControlName="type">
            <option value="">Select type</option>
            <option [value]="ThreatType.MALWARE">Malware</option>
            <option [value]="ThreatType.PHISHING">Phishing</option>
            <option [value]="ThreatType.DDOS">DDoS</option>
            <option [value]="ThreatType.INTRUSION">Intrusion</option>
            <option [value]="ThreatType.RANSOMWARE">Ransomware</option>
          </select>
        </div>

        <div class="form-group">
          <label>Severity *</label>
          <select formControlName="severity">
            <option value="">Select severity</option>
            <option [value]="ThreatSeverity.LOW">Low</option>
            <option [value]="ThreatSeverity.MEDIUM">Medium</option>
            <option [value]="ThreatSeverity.HIGH">High</option>
            <option [value]="ThreatSeverity.CRITICAL">Critical</option>
          </select>
        </div>

        <div class="form-group">
          <label>Source IP *</label>
          <input type="text" formControlName="sourceIp" placeholder="192.168.1.100" />
        </div>

        <div class="form-group">
          <label>Description *</label>
          <textarea formControlName="description" rows="4"></textarea>
        </div>

        @if (validationErrors().length > 0) {
          <div class="validation-errors">
            @for (error of validationErrors(); track error) {
              <p>{{ error }}</p>
            }
          </div>
        }

        @if (successMessage()) {
          <div class="success-message">{{ successMessage() }}</div>
        }

        <button type="submit" [disabled]="threatForm.invalid || loading()">
          {{ loading() ? 'Reporting...' : 'Report Threat' }}
        </button>
      </form>
    </div>
  `,
  styles: [`
    .report-container { max-width: 600px; margin: 30px auto; padding: 20px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 600; }
    input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    .validation-errors { background: #fff3cd; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
    .success-message { background: #d4edda; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
    button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:disabled { background: #ccc; }
  `]
})
export class ReportThreatComponent {
  private fb = inject(FormBuilder);
  private reportThreatUseCase = inject(ReportThreatUseCase);
  private validationFactory = inject(ThreatValidationFactory);
  private router = inject(Router);

  ThreatType = ThreatType;
  ThreatSeverity = ThreatSeverity;

  threatForm: FormGroup;
  loading = signal(false);
  validationErrors = signal<string[]>([]);
  successMessage = signal('');

  constructor() {
    this.threatForm = this.fb.group({
      type: ['', Validators.required],
      severity: ['', Validators.required],
      sourceIp: ['', [Validators.required, Validators.pattern(/^(\d{1,3}\.){3}\d{1,3}$/)]],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  onSubmit(): void {
    if (this.threatForm.invalid) return;

    const threat: ThreatRequest = this.threatForm.value;

    // HUMAN CHECK:
    // Aplicamos Strategy Pattern con Factory para validación específica por tipo
    const validator = this.validationFactory.createValidator(threat.type);
    const validation = validator.validate(threat);

    if (!validation.valid) {
      this.validationErrors.set(validation.errors);
      return;
    }

    this.validationErrors.set([]);
    this.loading.set(true);

    this.reportThreatUseCase.execute(threat).subscribe({
      next: (response) => {
        this.successMessage.set(`Threat reported! ID: ${response.threatId}`);
        this.threatForm.reset();
        this.loading.set(false);
        setTimeout(() => this.router.navigate(['/dashboard']), 2000);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}
