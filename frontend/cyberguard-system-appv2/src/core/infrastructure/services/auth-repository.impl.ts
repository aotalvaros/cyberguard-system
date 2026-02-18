import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthRepository } from '../../domain/ports/auth.repository';
import { LoginCredentials } from '../../domain/models/login-credentials.model';
import { AuthResponse } from '../../domain/models/auth-response.model';
import { User } from '../../domain/models/user.model';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthRepositoryImpl extends AuthRepository {
  private http = inject(HttpClient);
  private storage = inject(LocalStorageAdapter);
  private readonly API_URL = `${environment.apiUrl}/api/auth`;
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials);
  }

  saveToken(token: string): void {
    this.storage.set(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return this.storage.get(this.TOKEN_KEY);
  }

  saveUser(user: User): void {
    this.storage.set(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): User | null {
    const userData = this.storage.get(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  clearAuth(): void {
    this.storage.remove(this.TOKEN_KEY);
    this.storage.remove(this.USER_KEY);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
