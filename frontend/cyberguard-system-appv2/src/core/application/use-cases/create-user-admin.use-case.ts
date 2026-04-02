import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserAdminRepository } from '../../domain/ports/user-admin.repository';
import { UserAdminItem } from '../../domain/models/user-admin.model';
import { CreateUserAdminRequest } from '../../domain/models/user-admin-request.model';

@Injectable({ providedIn: 'root' })
export class CreateUserAdminUseCase {
  private userAdminRepository = inject(UserAdminRepository);

  execute(request: CreateUserAdminRequest): Observable<{ success: boolean; user: UserAdminItem }> {
    return this.userAdminRepository.createUser(request);
  }
}
