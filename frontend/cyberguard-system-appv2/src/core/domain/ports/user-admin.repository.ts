import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  UserAdminItem,
  UserAdminList,
} from '../models/user-admin.model';
import {
  CreateUserAdminRequest,
  UpdateUserAdminRequest,
  ToggleUserStatusRequest,
} from '../models/user-admin-request.model';

@Injectable()
export abstract class UserAdminRepository {
  abstract getUsers(): Observable<UserAdminList>;
  abstract getUserById(id: string): Observable<UserAdminItem>;
  abstract createUser(request: CreateUserAdminRequest): Observable<{ success: boolean; user: UserAdminItem }>;
  abstract updateUser(id: string, request: UpdateUserAdminRequest): Observable<{ success: boolean; user: UserAdminItem }>;
  abstract toggleUserStatus(id: string, request: ToggleUserStatusRequest): Observable<{ success: boolean; user: UserAdminItem; reassignedIncidents: number }>;
}
