import { Observable } from 'rxjs';
import { AdminProfile, ProfileUpdateData } from '../models/admin-profile.model';

/**
 * ⚠️ HUMAN CHECK: Puerto de salida (Hexagonal Architecture)
 *
 * Define el CONTRATO que AdminProfileHttpAdapter debe cumplir.
 * El dominio NO conoce si la implementación usa HTTP, mock o localStorage.
 *
 * Principio DIP (§3.5): capas internas definen interfaces, externas las implementan.
 * La autenticación (token) es responsabilidad del adaptador, no de este puerto.
 */
export abstract class AdminProfileRepository {
  abstract getProfile(): Observable<AdminProfile>;
  abstract updateProfile(data: ProfileUpdateData): Observable<AdminProfile>;
}
