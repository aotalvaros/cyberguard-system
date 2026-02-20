import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { LocalStorageAdapter } from '../adapters/local-storage.adapter';
import { AppErrorType, createAppError } from '../handlers/global-error.handler';
import { STORAGE_KEYS } from '@environments/constants';

/**
 * Mapea códigos HTTP a tipos de error de aplicación
 */
const mapHttpErrorToAppError = (error: HttpErrorResponse): ReturnType<typeof createAppError> => {
  const errorBody = error.error;
  const defaultMessage = errorBody?.message || errorBody?.error || error.message;

  switch (error.status) {
    case 0:
      return createAppError(
        AppErrorType.NETWORK,
        'Unable to connect to the server. Please check your internet connection.',
        new Error(defaultMessage),
        0
      );

    case 400:
      return createAppError(
        AppErrorType.VALIDATION,
        defaultMessage || 'Invalid request. Please check your input.',
        new Error(defaultMessage),
        400
      );

    case 401:
      return createAppError(
        AppErrorType.AUTHENTICATION,
        'Your session has expired. Please login again.',
        new Error(defaultMessage),
        401
      );

    case 403:
      return createAppError(
        AppErrorType.AUTHORIZATION,
        'You do not have permission to perform this action.',
        new Error(defaultMessage),
        403
      );

    case 404:
      return createAppError(
        AppErrorType.SERVER,
        'The requested resource was not found.',
        new Error(defaultMessage),
        404
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return createAppError(
        AppErrorType.SERVER,
        'Server error. Please try again later.',
        new Error(defaultMessage),
        error.status
      );

    default:
      return createAppError(
        AppErrorType.UNKNOWN,
        defaultMessage || 'An unexpected error occurred.',
        new Error(defaultMessage),
        error.status
      );
  }
};

/**
 * Interceptor funcional que maneja errores HTTP de forma centralizada.
 * 
 * Características:
 * - Transforma HttpErrorResponse a AppError estandarizado
 * - Maneja automáticamente errores 401 (limpia sesión y redirige)
 * - Propaga el error para que los componentes puedan manejarlo también
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const router = inject(Router);
  const storage = inject(LocalStorageAdapter);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const appError = mapHttpErrorToAppError(error);

      // Log del error para debugging
      console.error('[ErrorInterceptor]', {
        url: req.url,
        method: req.method,
        status: error.status,
        errorType: appError.type,
        message: appError.message
      });

      // Manejo especial para errores de autenticación
      if (error.status === 401) {
        storage.remove(STORAGE_KEYS.TOKEN);
        storage.remove(STORAGE_KEYS.USER);
        router.navigate(['/autenticacion']);
      }

      // Propagar el error como AppError para que los componentes puedan manejarlo
      return throwError(() => appError);
    })
  );
};
