import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../application/use-cases/get-current-user.use-case';
import { LoginCredentials } from '../../domain/models/login-credentials.model';
import { AuthResponse } from '../../domain/models/auth-response.model';
import { User } from '../../domain/models/user.model';
import { AuthRepository } from '../../domain/ports/auth.repository';
import { WebSocketService } from './websocket.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private loginUseCase = inject(LoginUseCase);
  private logoutUseCase = inject(LogoutUseCase);
  private getCurrentUserUseCase = inject(GetCurrentUserUseCase);
  private authRepository = inject(AuthRepository);
  private wsService = inject(WebSocketService);

  login(username: string, password: string): Observable<AuthResponse> {
    return this.loginUseCase.execute({ username, password }).pipe(
      tap(() => this.wsService.connect())
    );
  }

  logout(): void {
    this.wsService.disconnect();
    this.logoutUseCase.execute();
  }

  getToken(): string | null {
    return this.authRepository.getToken();
  }

  getCurrentUser(): User | null {
    return this.getCurrentUserUseCase.execute();
  }

  isAdmin(): boolean {
    return this.getCurrentUserUseCase.isAdmin();
  }

  isAuthenticated(): boolean {
    return this.authRepository.isAuthenticated();
  }
}
