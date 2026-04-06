import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AdminProfileRepository } from '../../domain/ports/admin-profile.repository';
import { AdminProfile, ProfileUpdateData } from '../../domain/models/admin-profile.model';
import { environment } from '@environments/environment';

/**
 * ⚠️ HUMAN CHECK: Token inyectado automáticamente via `authInterceptor` —
 * no se manipula el header `Authorization` directamente en este adaptador.
 * Ref: §6.1 #5 — credenciales nunca hardcodeadas.
 *
 * Mapper inline: solo extrae campos de dominio del DTO de respuesta.
 * Campos sensibles (isLocked, failedAttempts, etc.) nunca deben llegar aquí,
 * pero si el backend los incluyera por error quedarían fuera del modelo.
 */
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

  // ─── Mapper DTO → Domain ─────────────────────────────────────────────────
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

/**
 * AdminProfileDto — forma de la respuesta del backend.
 * Solo contiene campos que el backend expone (ver GetAdminProfileUseCase.ts).
 */
interface AdminProfileDto {
  username:  string;
  email:     string;
  role:      string;
  phone?:    string | null;
  createdAt: string;
}
