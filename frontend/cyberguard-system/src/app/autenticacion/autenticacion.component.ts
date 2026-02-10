import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
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
    this.auth.login(username!, password!).subscribe({
      next: (res) => {
        this.loading = false;
        this.success = 'Authentication successful';
        // Navigate to dashboard which will validate role
        setTimeout(() => this.router.navigate(['/dashboard']), 10);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to sign in';
      }
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }
}
