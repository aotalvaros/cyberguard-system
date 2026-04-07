import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { environment } from '@environments/environment';
import { STORAGE_KEYS } from '@environments/constants';

const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register'
];

const isPublicRoute = (url: string): boolean => {
  return PUBLIC_ROUTES.some(route => url.includes(route));
};

const isApiRequest = (url: string): boolean => {
  return url.startsWith(environment.apiUrl);
};

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const storage = inject(LocalStorageAdapter);

  if (!isApiRequest(req.url)) {
    return next(req);
  }

  if (isPublicRoute(req.url)) {
    return next(req);
  }

  const token = storage.get(STORAGE_KEYS.TOKEN);

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};
