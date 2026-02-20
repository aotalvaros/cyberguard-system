import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { STORAGE_KEYS } from '@environments/constants';

/**
 * Tipos de errores que maneja la aplicación
 */
export enum AppErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Estructura estandarizada de un error de aplicación
 */
export interface AppError {
  readonly type: AppErrorType;
  readonly message: string;
  readonly originalError?: Error;
  readonly statusCode?: number;
  readonly timestamp: Date;
}

/**
 * Crea un AppError estandarizado
 */
export function createAppError(
  type: AppErrorType,
  message: string,
  originalError?: Error,
  statusCode?: number
): AppError {
  return {
    type,
    message,
    originalError,
    statusCode,
    timestamp: new Date()
  };
}

/**
 * Manejador global de errores de la aplicación.
 * Centraliza el logging y manejo de errores no capturados.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private ngZone = inject(NgZone);
  private router = inject(Router);

  handleError(error: Error | AppError): void {
    const appError = this.normalizeError(error);
    
    // Log del error (en producción podría enviarse a un servicio de monitoreo)
    this.logError(appError);

    // Manejo específico según el tipo de error
    this.ngZone.run(() => {
      this.handleByType(appError);
    });
  }

  /**
   * Normaliza cualquier error a la estructura AppError
   */
  private normalizeError(error: Error | AppError): AppError {
    // Si ya es un AppError, retornarlo
    if (this.isAppError(error)) {
      return error;
    }

    // Detectar tipo de error basado en el mensaje o propiedades
    const errorMessage = error.message || 'An unexpected error occurred';
    
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return createAppError(AppErrorType.AUTHENTICATION, 'Session expired. Please login again.', error, 401);
    }
    
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      return createAppError(AppErrorType.AUTHORIZATION, 'You do not have permission to perform this action.', error, 403);
    }
    
    if (errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
      return createAppError(AppErrorType.NETWORK, 'Network error. Please check your connection.', error);
    }
    
    if (errorMessage.includes('500') || errorMessage.includes('Server')) {
      return createAppError(AppErrorType.SERVER, 'Server error. Please try again later.', error, 500);
    }

    return createAppError(AppErrorType.UNKNOWN, errorMessage, error);
  }

  /**
   * Type guard para verificar si es un AppError
   */
  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error &&
      'timestamp' in error
    );
  }

  /**
   * Log del error - en producción enviaría a un servicio de monitoreo
   */
  private logError(error: AppError): void {
    const logData = {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp.toISOString(),
      stack: error.originalError?.stack
    };

    // En desarrollo, mostrar en consola
    console.error('[GlobalErrorHandler]', logData);
  }

  /**
   * Manejo específico según el tipo de error
   */
  private handleByType(error: AppError): void {
    switch (error.type) {
      case AppErrorType.AUTHENTICATION:
        // Redirigir al login si la sesión expiró
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        this.router.navigate(['/autenticacion']);
        break;

      case AppErrorType.AUTHORIZATION:
        // Podría redirigir a una página de "acceso denegado"
        break;

      case AppErrorType.NETWORK:
      case AppErrorType.SERVER:
      case AppErrorType.VALIDATION:
      case AppErrorType.UNKNOWN:
        // Estos errores se manejan en los componentes individuales
        break;
    }
  }
}
