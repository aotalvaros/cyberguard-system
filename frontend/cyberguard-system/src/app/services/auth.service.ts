import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environment';

export interface LoginResponse {
  token: string;
  user: {
    username: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<LoginResponse['user'] | null>(this.readUserFromStorage());
  user$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.baseUrl}/login`, { username, password }).pipe(
      tap((res) => {
        this.saveSession(res.token, res.user);
      })
    );
  }

  private saveSession(token: string, user: LoginResponse['user']) {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
    } catch (e) {
      // storage might be full or unavailable in some environments
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): LoginResponse['user'] | null {
    return this.userSubject.value;
  }

  isAdmin(): boolean {
    const u = this.getUser();
    return !!u && (u.role === 'admin' || u.role === 'ADMIN');
  }

  private readUserFromStorage(): LoginResponse['user'] | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
