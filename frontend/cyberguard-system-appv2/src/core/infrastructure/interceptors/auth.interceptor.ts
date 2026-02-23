import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { environment } from '@environments/environment';
import { STORAGE_KEYS } from '@environments/constants';

/**
 * ⚠️ HUMAN CHECK: Interceptor de autenticación
 * 
 * Patrón: Chain of Responsibility (implícito en interceptores de Angular)
 * Cada request pasa por aquí antes de salir al servidor.
 * 
 * Decisión: Usamos STORAGE_KEYS.TOKEN en lugar de 'token' hardcodeado.
 * Si cambiamos la key de storage, solo modificamos constants.ts.
 * 
 * Rutas públicas: login y register NO necesitan token.
 * Si agregáramos forgot-password, lo añadimos a PUBLIC_ROUTES.
 */

/**
 * Rutas que NO requieren autenticación
 */
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register'
];

/**
 * Verifica si una URL es pública (no requiere token)
 */
const isPublicRoute = (url: string): boolean => {
  return PUBLIC_ROUTES.some(route => url.includes(route));
};

/**
 * Verifica si la URL pertenece a nuestra API
 */
const isApiRequest = (url: string): boolean => {
  return url.startsWith(environment.apiUrl);
};

/**
 * Interceptor funcional que agrega el token JWT a las peticiones HTTP.
 * 
 * Características:
 * - Solo agrega token a peticiones de nuestra API
 * - Excluye rutas públicas como login
 * - Usa el patrón inmutable (clona la request)
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const storage = inject(LocalStorageAdapter);
  
  // Solo interceptar peticiones a nuestra API
  if (!isApiRequest(req.url)) {
    return next(req);
  }

  // No agregar token a rutas públicas
  if (isPublicRoute(req.url)) {
    return next(req);
  }

  // Obtener token del storage
  const token = storage.get(STORAGE_KEYS.TOKEN);
  
  // Si no hay token, continuar sin modificar
  if (!token) {
    return next(req);
  }

  // Clonar la request y agregar el header de autorización
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};
