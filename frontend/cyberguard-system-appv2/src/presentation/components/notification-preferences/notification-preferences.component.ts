import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GetNotificationPreferencesUseCase } from '../../../core/application/use-cases/get-notification-preferences.use-case';
import { SaveNotificationPreferencesUseCase } from '../../../core/application/use-cases/save-notification-preferences.use-case';

@Component({
  selector: 'app-notification-preferences',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './notification-preferences.component.html',
  styleUrl: './notification-preferences.component.css',
})
export class NotificationPreferencesComponent implements OnInit, OnDestroy {
  private getUseCase = inject(GetNotificationPreferencesUseCase);
  private saveUseCase = inject(SaveNotificationPreferencesUseCase);
  private subs = new Subscription();

  form = new FormGroup({
    emailEnabled: new FormControl(false),
    email: new FormControl({ value: '', disabled: true }),
    whatsappEnabled: new FormControl(false),
    phone: new FormControl({ value: '', disabled: true }),
  });

  saving = signal(false);
  saveSuccess = signal(false);
  savingError = signal<string | null>(null);

  ngOnInit(): void {
    this.subs.add(
      this.getUseCase.execute().subscribe({
        next: (prefs) => {
          this.form.patchValue({
            emailEnabled: prefs.emailEnabled,
            email: prefs.email,
            whatsappEnabled: prefs.whatsappEnabled,
            phone: prefs.phone,
          });
          this.syncFieldState('emailEnabled', 'email');
          this.syncFieldState('whatsappEnabled', 'phone');
        },
      })
    );

    this.subs.add(
      this.form.get('emailEnabled')!.valueChanges.subscribe((enabled) => {
        const emailCtrl = this.form.get('email')!;
        enabled ? emailCtrl.enable() : emailCtrl.disable();
      })
    );

    this.subs.add(
      this.form.get('whatsappEnabled')!.valueChanges.subscribe((enabled) => {
        const phoneCtrl = this.form.get('phone')!;
        enabled ? phoneCtrl.enable() : phoneCtrl.disable();
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  save(): void {
    this.saving.set(true);
    this.saveSuccess.set(false);
    this.savingError.set(null);

    const raw = this.form.getRawValue();
    this.subs.add(
      this.saveUseCase
        .execute({
          emailEnabled: raw.emailEnabled ?? false,
          email: raw.email ?? '',
          whatsappEnabled: raw.whatsappEnabled ?? false,
          phone: raw.phone ?? '',
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.saveSuccess.set(true);
          },
          error: (err: Error) => {
            this.saving.set(false);
            this.saveSuccess.set(false);
            this.savingError.set(err.message || 'Error al guardar preferencias');
          },
        })
    );
  }

  private syncFieldState(toggleName: string, fieldName: string): void {
    const enabled = this.form.get(toggleName)?.value;
    const field = this.form.get(fieldName)!;
    enabled ? field.enable() : field.disable();
  }
}
