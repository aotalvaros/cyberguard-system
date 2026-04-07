import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminProfileRepository } from '../../domain/ports/admin-profile.repository';
import { AdminProfile, ProfileUpdateData } from '../../domain/models/admin-profile.model';

@Injectable({ providedIn: 'root' })
export class UpdateAdminProfileUseCase {
  private adminProfileRepository = inject(AdminProfileRepository);

  execute(data: ProfileUpdateData): Observable<AdminProfile> {
    return this.adminProfileRepository.updateProfile(data);
  }
}
