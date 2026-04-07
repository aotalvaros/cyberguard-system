import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AdminProfileFacade } from '../../../core/application/facades/admin-profile.facade';
import { AdminProfile, ProfileUpdateData } from '../../../core/domain/models/admin-profile.model';

/**
 * Validator personalizado E.164 para número telefónico (R-FE-09)
 * Patrón: '+' seguido de 7-15 dígitos (sin espacios ni guiones)
 */
function phoneE164Validator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null; // opcional
  return /^\+[1-9]\d{6,14}$/.test(control.value)
    ? null
    : { phoneE164: true };
}

/**
 * ProfileComponent — Vista de gestión de perfil personal (EP-01)
 *
 * Satisface: HU-01 (consulta/edición) + HU-02 (teléfono)
 *
 * Requisitos cubiertos:
 *   R-FE-01: sección "Perfil Personal"
 *   R-FE-02: pre-carga con datos actuales via AdminProfileFacade
 *   R-FE-03: campo role deshabilitado (solo lectura)
 *   R-FE-04: skeleton spinner durante carga
 *   R-FE-05: errores inline por campo
 *   R-FE-06: botón "Guardar" deshabilitado si sin cambios o inválido
 *   R-FE-07: snackbar "Perfil actualizado correctamente" tras 200 OK
 *   R-FE-08: snackbar de error ante 4xx/5xx (vía error$ de facade)
 *   R-FE-09: campo phone acepta E.164
 *   R-FE-10: formulario se actualiza sin recargar página
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <h2>👤 Perfil Personal</h2>

      <!-- Skeleton / Loading state (R-FE-04) -->
      @if (loading()) {
        <div class="skeleton-loader" role="status" aria-label="Cargando perfil...">
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      }

      <!-- Formulario de perfil -->
      @if (!loading() && profileForm) {
        <form [formGroup]="profileForm" (ngSubmit)="onSave()">

          <!-- Username -->
          <div class="form-group">
            <label for="username">Nombre de usuario</label>
            <input
              id="username"
              type="text"
              formControlName="username"
              placeholder="username"
            />
            @if (profileForm.get('username')?.invalid && profileForm.get('username')?.touched) {
              <span class="field-error">
                @if (profileForm.get('username')?.errors?.['required']) {
                  El nombre de usuario es requerido.
                }
                @if (profileForm.get('username')?.errors?.['minlength']) {
                  Mínimo 3 caracteres.
                }
                @if (profileForm.get('username')?.errors?.['maxlength']) {
                  Máximo 50 caracteres.
                }
              </span>
            }
          </div>

          <!-- Email -->
          <div class="form-group">
            <label for="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              formControlName="email"
              placeholder="admin@cyberguard.com"
            />
            @if (profileForm.get('email')?.invalid && profileForm.get('email')?.touched) {
              <span class="field-error">
                @if (profileForm.get('email')?.errors?.['required']) {
                  El correo es requerido.
                }
                @if (profileForm.get('email')?.errors?.['email']) {
                  Formato de correo inválido.
                }
              </span>
            }
          </div>

          <!-- Teléfono (R-FE-09 — E.164) -->
          <div class="form-group">
            <label for="phone">Número telefónico <span class="optional">(opcional)</span></label>
            <input
              id="phone"
              type="tel"
              formControlName="phone"
              placeholder="+573001234567"
            />
            @if (profileForm.get('phone')?.invalid && profileForm.get('phone')?.touched) {
              <span class="field-error">
                Formato inválido. Use E.164: +57XXXXXXXXXX
              </span>
            }
            <small class="hint">Formato internacional, ej: +573001234567</small>
          </div>

          <!-- Role — solo lectura (R-FE-03) -->
          <div class="form-group">
            <label for="role">Rol</label>
            <input
              id="role"
              type="text"
              formControlName="role"
              readonly
              class="readonly-field"
            />
            <small class="hint">El rol no puede modificarse desde este panel.</small>
          </div>

          <!-- Fecha de creación — solo visualización -->
          @if (currentProfile()) {
            <div class="form-group meta">
              <span>Miembro desde: {{ currentProfile()!.createdAt | date:'mediumDate' }}</span>
            </div>
          }

          <!-- Mensajes de éxito / error (R-FE-07 / R-FE-08) -->
          @if (successMessage()) {
            <div class="toast success" role="alert">
              ✅ {{ successMessage() }}
              <button type="button" class="toast-close" (click)="clearSuccess()">✕</button>
            </div>
          }
          @if (errorMessage()) {
            <div class="toast error" role="alert">
              ⚠️ {{ errorMessage() }}
              <button type="button" class="toast-close" (click)="clearError()">✕</button>
            </div>
          }

          <!-- Botón guardar (R-FE-06: deshabilitado si no hay cambios o inválido) -->
          <button
            type="submit"
            [disabled]="profileForm.invalid || !hasChanges() || saving()"
            class="btn-save"
          >
            {{ saving() ? 'Guardando...' : 'Guardar cambios' }}
          </button>

        </form>
      }
    </div>
  `,
  styles: [`
    .profile-container { max-width: 520px; margin: 40px auto; padding: 24px; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
    h2 { margin-bottom: 24px; color: #1a1a2e; }
    .form-group { margin-bottom: 18px; }
    label { display: block; font-weight: 600; margin-bottom: 6px; color: #333; }
    .optional { font-weight: 400; color: #888; font-size: 0.85em; }
    input { width: 100%; padding: 10px 12px; border: 1px solid #d0d5dd; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
    input:focus { outline: none; border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,.15); }
    .readonly-field { background: #f5f5f5; cursor: not-allowed; color: #666; }
    .field-error { display: block; color: #e53e3e; font-size: 12px; margin-top: 4px; }
    .hint { display: block; color: #888; font-size: 12px; margin-top: 4px; }
    .meta { color: #666; font-size: 13px; padding: 8px 0; border-top: 1px solid #eee; }
    .toast { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 14px; }
    .toast.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .toast.error   { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .toast-close { background: none; border: none; cursor: pointer; font-size: 16px; padding: 0 4px; opacity: .6; }
    .toast-close:hover { opacity: 1; }
    .btn-save { width: 100%; padding: 12px; background: #007bff; color: #fff; border: none; border-radius: 6px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; transition: background .2s; }
    .btn-save:hover:not(:disabled) { background: #0056b3; }
    .btn-save:disabled { background: #b0c4de; cursor: not-allowed; }
    .skeleton-loader { padding: 16px 0; }
    .skeleton-line { height: 16px; background: linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%); border-radius: 4px; margin-bottom: 14px; animation: shimmer 1.5s infinite; }
    .skeleton-line.short { width: 60%; }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
  `]
})
export class ProfileComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private facade = inject(AdminProfileFacade);

  profileForm!: FormGroup;
  currentProfile = signal<AdminProfile | null>(null);
  loading        = signal(false);
  saving         = signal(false);
  successMessage = signal('');
  errorMessage   = signal('');

  /** Original form values — para detectar cambios (R-FE-06) */
  private originalValues: Partial<AdminProfile> = {};

  ngOnInit(): void {
    // Construir form vacío para que el template lo encuentre
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email:    ['', [Validators.required, Validators.email]],
      phone:    [null, [phoneE164Validator]],
      role:     [{ value: '', disabled: true }],
    });

    // Suscribir a loading$ de la facade
    this.facade.loading$.subscribe(isLoading => {
      // Solo afecta el spinner de carga inicial (no el spinner de guardado)
      if (!this.saving()) this.loading.set(isLoading);
    });

    // Suscribir a profile$ de la facade
    this.facade.profile$.subscribe(profile => {
      if (profile) {
        this.currentProfile.set(profile);
        this.patchForm(profile);
      }
    });

    // Suscribir a error$ de la facade
    this.facade.error$.subscribe(err => {
      if (err) this.errorMessage.set(err);
    });

    // Cargar perfil
    this.facade.loadProfile();
  }

  onSave(): void {
    if (this.profileForm.invalid || !this.hasChanges()) return;

    const formValue = this.profileForm.getRawValue() as { username: string; email: string; phone: string | null; role: string };

    // Build as mutable intermediate — ProfileUpdateData uses readonly so we can't assign after construction
    const updates: { username?: string; email?: string; phone?: string | null } = {};
    if (formValue.username !== this.originalValues['username']) updates.username = formValue.username;
    if (formValue.email    !== this.originalValues['email'])    updates.email    = formValue.email;
    if (formValue.phone    !== this.originalValues['phone'])    updates.phone    = formValue.phone || null;
    const data: ProfileUpdateData = updates;

    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.facade.updateProfile(data);

    // Escuchar el resultado via profile$ (R-FE-10 — sin reload)
    const sub = this.facade.profile$.subscribe(updated => {
      if (updated && updated !== this.currentProfile()) {
        this.saving.set(false);
        this.successMessage.set('Perfil actualizado correctamente.');
        setTimeout(() => this.successMessage.set(''), 5000);
        sub.unsubscribe();
      }
    });

    // Timeout de seguridad en caso de error
    this.facade.error$.subscribe(err => {
      if (err) {
        this.saving.set(false);
        sub.unsubscribe();
      }
    });
  }

  /** Detecta si hay cambios respecto al perfil cargado (R-FE-06) */
  hasChanges(): boolean {
    if (!this.profileForm) return false;
    const v = this.profileForm.getRawValue() as Record<string, unknown>;
    return (
      v['username'] !== this.originalValues['username'] ||
      v['email']    !== this.originalValues['email']    ||
      (v['phone'] || null) !== this.originalValues['phone']
    );
  }

  clearSuccess(): void { this.successMessage.set(''); }
  clearError(): void {
    this.errorMessage.set('');
    this.facade.clearError();
  }

  private patchForm(profile: AdminProfile): void {
    this.profileForm.patchValue({
      username: profile.username,
      email:    profile.email,
      phone:    profile.phone,
      role:     profile.role,
    });
    this.originalValues = {
      username:  profile.username,
      email:     profile.email,
      phone:     profile.phone,
      createdAt: profile.createdAt,
    };
  }
}
