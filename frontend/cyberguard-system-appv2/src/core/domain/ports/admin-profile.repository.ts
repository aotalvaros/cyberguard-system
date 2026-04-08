import { Observable } from 'rxjs';
import { AdminProfile, ProfileUpdateData } from '../models/admin-profile.model';

export abstract class AdminProfileRepository {
  abstract getProfile(): Observable<AdminProfile>;
  abstract updateProfile(data: ProfileUpdateData): Observable<AdminProfile>;
}
