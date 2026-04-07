import { Observable } from 'rxjs';
import { LoginCredentials } from '../models/login-credentials.model';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';

export abstract class AuthRepository {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract saveToken(token: string): void;
  abstract getToken(): string | null;
  abstract saveUser(user: User): void;
  abstract getUser(): User | null;
  abstract clearAuth(): void;
  abstract isAuthenticated(): boolean;
}
