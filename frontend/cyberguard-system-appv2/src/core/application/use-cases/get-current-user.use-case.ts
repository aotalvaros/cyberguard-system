import { inject, Injectable } from '@angular/core';
import { AuthRepository } from '../../domain/ports/auth.repository';
import { User } from '../../domain/models/user.model';
import { ROLES } from '../../../environments/constants';

/**
 * ⚠️ HUMAN CHECK: Use Case Pattern aplicado
 * 
 * Este Use Case encapsula la lógica de obtener el usuario actual.
 * Sigue el principio SRP: solo tiene una razón para cambiar.
 * 
 * Nota: isAdmin() está aquí y no en el modelo User porque es una regla
 * de negocio de autorización, no un atributo del usuario.
 * Si mañana agregamos más roles (moderator, superadmin), solo 
 * modificamos este archivo.
 */
@Injectable({ providedIn: 'root' })
export class GetCurrentUserUseCase {
  private authRepository = inject(AuthRepository);

  execute(): User | null {
    return this.authRepository.getUser();
  }

  isAdmin(): boolean {
    const user = this.execute();
    return user?.role === ROLES.ADMIN;
  }
}
