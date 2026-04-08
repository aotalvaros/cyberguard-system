import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthRepository } from '../../domain/ports/auth.repository';
import { LoginCredentials } from '../../domain/models/login-credentials.model';
import { AuthResponse } from '../../domain/models/auth-response.model';
import { User } from '../../domain/models/user.model';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { AuthMapper } from '../mappers/auth.mapper';
import { LoginResponseDto } from '../dto/auth.dto';
import { environment } from '@environments/environment';
import { STORAGE_KEYS } from '@environments/constants';

@Injectable({ providedIn: 'root' })
export class AuthRepositoryImpl extends AuthRepository {
  private http = inject(HttpClient);
  private storage = inject(LocalStorageAdapter);
  private readonly API_URL = `${environment.apiUrl}/api/auth`;
  private readonly TOKEN_KEY = STORAGE_KEYS.TOKEN;
  private readonly USER_KEY = STORAGE_KEYS.USER;

  login(credentials: LoginCredentials): Observable<AuthResponse> {

    const requestDto = AuthMapper.toLoginRequestDto(credentials);

    return this.http.post<LoginResponseDto>(`${this.API_URL}/login`, requestDto).pipe(

      map(dto => AuthMapper.toAuthResponse(dto))
    );
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
