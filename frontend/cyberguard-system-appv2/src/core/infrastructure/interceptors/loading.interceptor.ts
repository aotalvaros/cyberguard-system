import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../state/loading.service';

/**
 * Interceptor que trackea automáticamente el estado de carga de peticiones HTTP.
 * 
 * Muestra/oculta el loading global basado en el número de peticiones activas.
 * Solo trackea peticiones a la API (ignora assets, etc).
 * 
 * @example
 * El interceptor funciona automáticamente para todas las llamadas HTTP:
 * ```typescript
 * // La UI puede mostrar el spinner basándose en el estado global
 * @if (loadingService.isLoading()) {
 *   <app-spinner />
 * }
 * ```
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Solo trackear peticiones a APIs, no a assets estáticos
  const shouldTrack = isApiRequest(req.url);
  
  if (shouldTrack) {
    loadingService.startLoading('generic', getLoadingMessage(req));
  }
  
  return next(req).pipe(
    finalize(() => {
      if (shouldTrack) {
        loadingService.stopLoading('generic');
      }
    })
  );
};

/**
 * Determina si la URL es una petición a la API
 */
function isApiRequest(url: string): boolean {
  // Ignorar assets estáticos, WebSocket, y URLs relativas de archivos
  const staticPatterns = [
    '/assets/',
    '.html',
    '.css',
    '.js',
    '.ico',
    '.png',
    '.jpg',
    '.svg',
    'sockjs',
    'websocket'
  ];
  
  return !staticPatterns.some(pattern => 
    url.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Genera un mensaje descriptivo basado en el tipo de petición
 */
function getLoadingMessage(req: { method: string; url: string }): string {
  const method = req.method.toUpperCase();
  
  switch (method) {
    case 'GET':
      return 'Cargando datos...';
    case 'POST':
      return 'Enviando datos...';
    case 'PUT':
    case 'PATCH':
      return 'Actualizando...';
    case 'DELETE':
      return 'Eliminando...';
    default:
      return 'Procesando...';
  }
}
