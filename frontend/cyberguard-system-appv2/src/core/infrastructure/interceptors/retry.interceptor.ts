import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer } from 'rxjs';

/**
 * Configuración del retry
 */
const RETRY_CONFIG = {
  /** Número máximo de reintentos */
  maxRetries: 3,
  /** Delay inicial entre reintentos (ms) */
  initialDelay: 1000,
  /** Factor de multiplicación para backoff exponencial */
  backoffFactor: 2,
  /** Códigos HTTP que NO deben reintentarse */
  nonRetryableStatuses: [400, 401, 403, 404, 422]
} as const;

/**
 * Determina si un error HTTP debe reintentarse
 */
const shouldRetry = (error: HttpErrorResponse): boolean => {
  // No reintentar errores de validación o autenticación
  const nonRetryable = RETRY_CONFIG.nonRetryableStatuses as readonly number[];
  if (nonRetryable.includes(error.status)) {
    return false;
  }

  // Reintentar errores de red (status 0) o errores de servidor (5xx)
  return error.status === 0 || error.status >= 500;
};

/**
 * Calcula el delay para el reintento usando backoff exponencial
 */
const calculateDelay = (retryCount: number): number => {
  return RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount);
};

/**
 * Interceptor funcional que reintenta automáticamente las peticiones
 * que fallan por errores de red o del servidor.
 * 
 * Características:
 * - Backoff exponencial (1s, 2s, 4s)
 * - Máximo 3 reintentos
 * - NO reintenta errores 4xx (excepto timeout)
 * - Solo reintenta errores de red (status 0) y servidor (5xx)
 */
export const retryInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  return next(req).pipe(
    retry({
      count: RETRY_CONFIG.maxRetries,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        // Log del reintento
        console.warn(`[RetryInterceptor] Retry attempt ${retryCount} for ${req.url}`, {
          status: error.status,
          message: error.message
        });

        // Si no debe reintentarse, lanzar error inmediatamente
        if (!shouldRetry(error)) {
          throw error;
        }

        // Calcular delay con backoff exponencial
        const delay = calculateDelay(retryCount - 1);
        console.info(`[RetryInterceptor] Waiting ${delay}ms before retry...`);
        
        return timer(delay);
      }
    })
  );
};
