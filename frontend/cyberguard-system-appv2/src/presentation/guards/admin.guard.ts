import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../core/infrastructure/services/auth.service';

/**
 * HUMAN CHECK: Guard funcional para rutas de administrador
 * 
 * Implementación: Usamos CanActivateFn (funcional) en lugar de clase
 * porque Angular 15+ lo recomienda y es más ligero.
 * 
 * Diferencia con authGuard:
 * - authGuard: cualquier usuario logueado (viewer, admin)
 * - adminGuard: SOLO usuarios con rol 'admin'
 * 
 * Si el usuario no es admin, lo redirigimos a login.
 * Alternativa: podríamos mostrar página 403, pero por UX preferimos login.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  router.navigate(['/autenticacion']);
  return false;
};
