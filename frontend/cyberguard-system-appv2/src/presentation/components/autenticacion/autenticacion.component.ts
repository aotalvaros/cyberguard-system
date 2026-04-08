import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize, timeout } from 'rxjs';
import { LoginUseCase } from '../../../core/application/use-cases/login.use-case';

@Component({
  selector: 'app-autenticacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './autenticacion.component.html',
  styleUrl: './autenticacion.component.css'
})
export class AutenticacionComponent {
  private fb = inject(FormBuilder);
  private loginUseCase = inject(LoginUseCase);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  error = '';
  loading = false;

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = '';

    const { username, password } = this.loginForm.value;

    this.loginUseCase.execute({ username: username!, password: password! })
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          if (err.name === 'TimeoutError') {
            this.error = 'Tiempo de espera agotado. Intenta nuevamente.';
          } else {
            this.error = err.error?.error || err.error?.message || 'Error de autenticación';
          }
          this.cdr.detectChanges();
        }
      });
  }
}
