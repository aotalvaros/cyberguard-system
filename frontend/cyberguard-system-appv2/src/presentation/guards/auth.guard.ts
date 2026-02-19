import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../../core/infrastructure/services/auth.service';

/**
 * Guard que verifica si el usuario está autenticado.
 * Permite acceso a cualquier usuario logueado (cualquier rol).
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/autenticacion']);
  return false;
};
