import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AdminProfileRepository } from '../../domain/ports/admin-profile.repository';
import { AdminProfile, ProfileUpdateData } from '../../domain/models/admin-profile.model';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminProfileHttpAdapter extends AdminProfileRepository {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/admin/profile`;

  getProfile(): Observable<AdminProfile> {
    return this.http.get<AdminProfileDto>(this.API_URL).pipe(
      map(dto => this.toAdminProfile(dto))
    );
  }

  updateProfile(data: ProfileUpdateData): Observable<AdminProfile> {
    return this.http.patch<AdminProfileDto>(this.API_URL, data).pipe(
      map(dto => this.toAdminProfile(dto))
    );
  }

  private toAdminProfile(dto: AdminProfileDto): AdminProfile {
    return {
      username:  dto.username,
      email:     dto.email,
      role:      dto.role,
      phone:     dto.phone ?? null,
      createdAt: dto.createdAt,
    };
  }
}

interface AdminProfileDto {
  username:  string;
  email:     string;
  role:      string;
  phone?:    string | null;
  createdAt: string;
}
