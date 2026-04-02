import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserAdminRepository } from '../../domain/ports/user-admin.repository';
import { UserAdminItem } from '../../domain/models/user-admin.model';
import { UpdateUserAdminRequest } from '../../domain/models/user-admin-request.model';

@Injectable({ providedIn: 'root' })
export class UpdateUserAdminUseCase {
  private userAdminRepository = inject(UserAdminRepository);

  execute(id: string, request: UpdateUserAdminRequest): Observable<{ success: boolean; user: UserAdminItem }> {
    return this.userAdminRepository.updateUser(id, request);
  }
}
