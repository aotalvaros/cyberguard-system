import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminProfile, ProfileUpdateData } from '../models/admin-profile.model';

@Injectable()
export abstract class AdminProfileRepository {
  abstract getProfile(): Observable<AdminProfile>;
  abstract updateProfile(data: ProfileUpdateData): Observable<AdminProfile>;
}
