import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminProfileRepository } from '../../domain/ports/admin-profile.repository';
import { AdminProfile } from '../../domain/models/admin-profile.model';

@Injectable({ providedIn: 'root' })
export class GetAdminProfileUseCase {
  private adminProfileRepository = inject(AdminProfileRepository);

  execute(): Observable<AdminProfile> {
    return this.adminProfileRepository.getProfile();
  }
}
