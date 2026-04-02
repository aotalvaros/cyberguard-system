import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserAdminRepository } from '../../domain/ports/user-admin.repository';
import { UserAdminItem } from '../../domain/models/user-admin.model';

@Injectable({ providedIn: 'root' })
export class ToggleUserStatusUseCase {
  private userAdminRepository = inject(UserAdminRepository);

  execute(id: string, isActive: boolean): Observable<{ success: boolean; user: UserAdminItem; reassignedIncidents: number }> {
    return this.userAdminRepository.toggleUserStatus(id, { isActive });
  }
}
