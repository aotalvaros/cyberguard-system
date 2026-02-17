import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { WsService } from '../services/ws.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ThreatService, ThreatRequest } from '../services/threat.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  messages: any[] = [];
  private sub: Subscription | null = null;
  form: any;
  submitting = false;
  formError = '';
  formSuccess = '';

  constructor(
    private ws: WsService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private threatService: ThreatService
  ) {
    this.form = this.fb.group({
      type: ['intrusion', Validators.required],
      severity: ['medium', Validators.required],
      sourceIp: ['', [Validators.required, this.ipValidator]],
      targetIp: ['', [this.optionalIpValidator]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    if (!this.auth.isAdmin()) {
      this.router.navigate(['/autenticacion']);
      return;
    }
    this.ws.connect();
    this.sub = this.ws.messages$.subscribe((list) => {
      // `list` is an array of payloads (newest first)
      this.messages = (list || []).slice(0, 50);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.ws.disconnect();
  }

  deleteMessage(index: number) {
    this.ws.deleteMessage(index);
  }

  clearAll() {
    if (confirm('Delete all alerts?')) {
      this.ws.requestClearAll();
      this.ws.clearAll();
    }
  }

  submitThreat() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalidFields = this.getInvalidFieldLabels();
      this.formError = invalidFields.length
        ? `Please review: ${invalidFields.join(', ')}.`
        : 'Please review the required fields.';
      this.formSuccess = '';
      return;
    }

    const payload: ThreatRequest = {
      type: this.form.value.type,
      severity: this.form.value.severity,
      sourceIp: this.form.value.sourceIp,
      targetIp: this.form.value.targetIp || undefined,
      description: this.form.value.description,
      metadata: {
        reportedAtLocal: this.getBogotaTimestamp(),
        reportedAtTz: 'America/Bogota'
      }
    };

    this.submitting = true;
    this.formError = '';
    this.formSuccess = '';

    this.threatService.reportThreat(payload).subscribe({
      next: (res) => {
        this.formSuccess = res?.threatId ? `Report submitted. ID: ${res.threatId}` : 'Report submitted.';
        this.form.reset({
          type: 'intrusion',
          severity: 'medium',
          sourceIp: '',
          targetIp: '',
          description: ''
        });
        this.submitting = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.formError = this.extractErrorMessage(err);
        this.submitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  private ipValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '').trim();
    const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    return ipv4.test(value) ? null : { ip: true };
  }

  private optionalIpValidator(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value || '').trim();
    if (!value) return null;
    const ipv4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    return ipv4.test(value) ? null : { ip: true };
  }

  private extractErrorMessage(err: any): string {
    if (!err) return 'Unable to submit the report.';
    try {
      if (err.error) {
        if (typeof err.error === 'string' && err.error.trim()) return err.error.trim();
        if (typeof err.error === 'object') {
          if (err.error.error) return err.error.error;
          if (err.error.message) return err.error.message;
        }
      }
      if (err.message) return err.message;
      return 'Unable to submit the report.';
    } catch {
      return 'Unable to submit the report.';
    }
  }

  private getBogotaTimestamp(): string {
    try {
      return new Date().toLocaleString('es-CO', {
        timeZone: 'America/Bogota',
        hour12: false
      });
    } catch {
      return new Date().toISOString();
    }
  }

  getControl(name: string): AbstractControl | null {
    return this.form?.get ? this.form.get(name) : null;
  }

  private getInvalidFieldLabels(): string[] {
    if (!this.form?.controls) return [];
    const labels: Record<string, string> = {
      type: 'Type',
      severity: 'Severity',
      sourceIp: 'Source IP',
      targetIp: 'Target IP',
      description: 'Description'
    };

    return Object.keys(this.form.controls)
      .filter((key) => this.form.controls[key].invalid)
      .map((key) => labels[key] || key);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/autenticacion']);
  }
}
