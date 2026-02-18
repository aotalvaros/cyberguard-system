import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthRepository } from '../../domain/ports/auth.repository';
import { LoginCredentials } from '../../domain/models/login-credentials.model';
import { AuthResponse } from '../../domain/models/auth-response.model';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private authRepository = inject(AuthRepository);

  execute(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.authRepository.login(credentials).pipe(
      tap((response) => {
        this.authRepository.saveToken(response.token);
        this.authRepository.saveUser(response.user);
      })
    );
  }
}
