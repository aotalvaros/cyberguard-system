import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-autenticacion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './autenticacion.component.html',
  styleUrls: ['./autenticacion.component.css']
})
export class AutenticacionComponent {
  form: any;

  loading = false;
  error = '';
  success = '';
  showPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private zone: NgZone, private cdr: ChangeDetectorRef) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [false]
    });
  }
  /*  Human Check
    Here we validate the form and call the AuthService to perform the login.
    We handle loading state, display success or error messages,
    and navigate to the home page on successful authentication. 
    The togglePassword method allows users to show or hide their password input for better usability.

    How we can see, we are using .subscribe() to handle the asynchronous login call,
    keeping observer pattern.

  */
  submit() {
    if (this.form.invalid) {
      this.error = 'Please fill in all required fields';
      return;
    }
    this.loading = true;
    this.error = '';
    this.success = '';
    const { username, password } = this.form.value;
    this.auth.login(username!, password!).pipe(
      // fail fast if backend doesn't respond in time
      timeout({ each: 10000 }),
      catchError((err) => {
        const msg = (err && err.name === 'TimeoutError') ? 'Request timed out. Please try again.' : this.extractErrorMessage(err);
        this.zone.run(() => {
          this.error = msg;
          this.cdr.detectChanges();
        });
        return throwError(() => err);
      }),
      finalize(() => {
        // ensure loading is cleared regardless of outcome and trigger change detection
        this.zone.run(() => {
          this.loading = false;
          this.cdr.detectChanges();
        });
      })
    ).subscribe({
      next: (res) => {
        this.zone.run(() => {
          this.success = 'Authentication successful';
          this.router.navigate(['/dashboard']);
        });
      },
      error: () => {
        // error already handled in catchError above; no-op here to avoid duplicate messages
      }
    });
  }

  private extractErrorMessage(err: any): string {
    if (!err) return 'Unable to sign in';
    // Quick debug to help identify shape in the wild
    try {
      console.debug('[Auth error]', err);
    } catch {}

    // Common shapes: { error: { message: '...' } } or { error: 'string' } or { message: '...' }
    try {
      if (err.error) {
        // string responses sometimes come quoted like '"Invalid credentials"'
        if (typeof err.error === 'string' && err.error.trim()) {
          const raw = err.error.trim();
          // strip surrounding quotes
          if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            return raw.slice(1, -1);
          }
          return raw;
        }

        if (typeof err.error === 'object') {
          if (err.error.message) return err.error.message;
          if (err.error.msg) return err.error.msg;
          // some APIs return { error: 'Invalid credentials' }
          if (typeof err.error.error === 'string') return err.error.error;
        }
      }

      // Sometimes the server message is embedded in the top-level message
      if (typeof err.message === 'string') {
        const m = err.message;
        // try to extract known backend phrase
        const match = m.match(/Invalid credentials/i);
        if (match) return match[0];
        return m;
      }

      if (err.statusText) return `${err.status} ${err.statusText}`;
      const s = JSON.stringify(err);
      return s.length > 200 ? s.slice(0, 200) + '...' : s;
    } catch {
      return 'Unable to sign in';
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
