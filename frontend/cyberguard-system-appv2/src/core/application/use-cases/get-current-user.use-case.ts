import { inject, Injectable } from '@angular/core';
import { AuthRepository } from '../../domain/ports/auth.repository';
import { User } from '../../domain/models/user.model';

@Injectable({ providedIn: 'root' })
export class GetCurrentUserUseCase {
  private authRepository = inject(AuthRepository);

  execute(): User | null {
    return this.authRepository.getUser();
  }

  isAdmin(): boolean {
    const user = this.execute();
    return user?.role === 'admin';
  }
}
