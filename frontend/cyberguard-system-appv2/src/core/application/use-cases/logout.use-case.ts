import { inject, Injectable } from '@angular/core';
import { AuthRepository } from '../../domain/ports/auth.repository';

@Injectable({ providedIn: 'root' })
export class LogoutUseCase {
  private authRepository = inject(AuthRepository);

  execute(): void {
    this.authRepository.clearAuth();
  }
}
