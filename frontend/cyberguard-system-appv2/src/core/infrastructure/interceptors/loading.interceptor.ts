import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../state/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

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

function isApiRequest(url: string): boolean {

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
