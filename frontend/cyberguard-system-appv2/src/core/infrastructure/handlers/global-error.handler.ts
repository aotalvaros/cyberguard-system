import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { STORAGE_KEYS } from '@environments/constants';

export enum AppErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  readonly type: AppErrorType;
  readonly message: string;
  readonly originalError?: Error;
  readonly statusCode?: number;
  readonly timestamp: Date;
}

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

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private ngZone = inject(NgZone);
  private router = inject(Router);

  handleError(error: Error | AppError): void {
    const appError = this.normalizeError(error);

    this.logError(appError);

    this.ngZone.run(() => {
      this.handleByType(appError);
    });
  }

  private normalizeError(error: Error | AppError): AppError {

    if (this.isAppError(error)) {
      return error;
    }

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

  private isAppError(error: unknown): error is AppError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error &&
      'timestamp' in error
    );
  }

  private logError(error: AppError): void {
    const logData = {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp.toISOString(),
      stack: error.originalError?.stack
    };

    console.error('[GlobalErrorHandler]', logData);
  }

  private handleByType(error: AppError): void {
    switch (error.type) {
      case AppErrorType.AUTHENTICATION:

        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        this.router.navigate(['/autenticacion']);
        break;

      case AppErrorType.AUTHORIZATION:

        break;

      case AppErrorType.NETWORK:
      case AppErrorType.SERVER:
      case AppErrorType.VALIDATION:
      case AppErrorType.UNKNOWN:

        break;
    }
  }
}
