import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminProfileRepository } from '../../domain/ports/admin-profile.repository';
import { AdminProfile } from '../../domain/models/admin-profile.model';

/**
 * Use Case: GetAdminProfileUseCase (Frontend)
 *
 * SRP §3.1: única responsabilidad — delegar la consulta del perfil al repositorio.
 * DIP §3.5: depende del puerto abstracto, no de AdminProfileHttpAdapter.
 */
@Injectable({ providedIn: 'root' })
export class GetAdminProfileUseCase {
  private adminProfileRepository = inject(AdminProfileRepository);

  execute(): Observable<AdminProfile> {
    return this.adminProfileRepository.getProfile();
  }
}
