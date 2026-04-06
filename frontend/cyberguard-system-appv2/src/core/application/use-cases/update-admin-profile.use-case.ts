import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminProfileRepository } from '../../domain/ports/admin-profile.repository';
import { AdminProfile, ProfileUpdateData } from '../../domain/models/admin-profile.model';

/**
 * Use Case: UpdateAdminProfileUseCase (Frontend)
 *
 * SRP §3.1: única responsabilidad — delegar la actualización al repositorio.
 * DIP §3.5: depende del puerto abstracto, no de AdminProfileHttpAdapter.
 *
 * El campo `role` está AUSENTE en ProfileUpdateData (R-FE-03 / R-BE-04).
 */
@Injectable({ providedIn: 'root' })
export class UpdateAdminProfileUseCase {
  private adminProfileRepository = inject(AdminProfileRepository);

  execute(data: ProfileUpdateData): Observable<AdminProfile> {
    return this.adminProfileRepository.updateProfile(data);
  }
}
