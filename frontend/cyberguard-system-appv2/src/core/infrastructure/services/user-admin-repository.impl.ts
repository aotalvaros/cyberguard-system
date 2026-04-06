import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserAdminRepository } from '../../domain/ports/user-admin.repository';
import { UserAdminItem, UserAdminList } from '../../domain/models/user-admin.model';
import {
  CreateUserAdminRequest,
  UpdateUserAdminRequest,
  ToggleUserStatusRequest,
} from '../../domain/models/user-admin-request.model';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class UserAdminRepositoryImpl extends UserAdminRepository {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/admin/users`;

  getUsers(): Observable<UserAdminList> {
    return this.http.get<UserAdminList>(this.API_URL);
  }

  getUserById(id: string): Observable<UserAdminItem> {
    return this.http.get<UserAdminItem>(`${this.API_URL}/${id}`);
  }

  createUser(request: CreateUserAdminRequest): Observable<{ success: boolean; user: UserAdminItem }> {
    return this.http.post<{ success: boolean; user: UserAdminItem }>(this.API_URL, request);
  }

  updateUser(id: string, request: UpdateUserAdminRequest): Observable<{ success: boolean; user: UserAdminItem }> {
    return this.http.put<{ success: boolean; user: UserAdminItem }>(`${this.API_URL}/${id}`, request);
  }

  toggleUserStatus(id: string, request: ToggleUserStatusRequest): Observable<{ success: boolean; user: UserAdminItem; reassignedIncidents: number }> {
    return this.http.patch<{ success: boolean; user: UserAdminItem; reassignedIncidents: number }>(
      `${this.API_URL}/${id}/status`,
      request,
    );
  }
}
