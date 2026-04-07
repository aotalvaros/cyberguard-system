import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserAdminRepository } from '../../domain/ports/user-admin.repository';
import { UserAdminList } from '../../domain/models/user-admin.model';


@Injectable({ providedIn: 'root' })
export class GetUsersUseCase {
  private userAdminRepository = inject(UserAdminRepository);

  execute(): Observable<UserAdminList> {
    return this.userAdminRepository.getUsers();
  }
}
