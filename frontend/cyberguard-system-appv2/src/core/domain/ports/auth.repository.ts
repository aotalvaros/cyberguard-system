import { Observable } from 'rxjs';
import { LoginCredentials } from '../models/login-credentials.model';
import { AuthResponse } from '../models/auth-response.model';
import { User } from '../models/user.model';

/**
 * HUMAN CHECK: Puerto de salida (Hexagonal Architecture)
 * 
 * Este es un PUERTO, no una implementación. Define el CONTRATO que
 * cualquier adaptador de autenticación debe cumplir.
 * 
 * Beneficios:
 * - El dominio NO conoce si usamos localStorage, sessionStorage o cookies
 * - Podemos cambiar la implementación sin tocar la lógica de negocio
 * - Facilita testing: en tests inyectamos un mock que implementa este contrato
 * 
 * Principio DIP: Las capas internas definen interfaces, las externas las implementan
 */
export abstract class AuthRepository {
  abstract login(credentials: LoginCredentials): Observable<AuthResponse>;
  abstract saveToken(token: string): void;
  abstract getToken(): string | null;
  abstract saveUser(user: User): void;
  abstract getUser(): User | null;
  abstract clearAuth(): void;
  abstract isAuthenticated(): boolean;
}
