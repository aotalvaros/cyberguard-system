import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Environment } from '../../../../cyberguard-system/environment';

export interface LoginResponse {
  token: string;
  user: {
    username: string;
    role: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private http: HttpClient, private environment: Environment) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.environment.baseUrl}/login`, { username, password });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
