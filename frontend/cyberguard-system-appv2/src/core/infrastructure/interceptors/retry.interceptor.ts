import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { retry, timer } from 'rxjs';

const RETRY_CONFIG = {

  maxRetries: 3,

  initialDelay: 1000,

  backoffFactor: 2,

  nonRetryableStatuses: [400, 401, 403, 404, 422]
} as const;

const shouldRetry = (error: HttpErrorResponse): boolean => {

  const nonRetryable = RETRY_CONFIG.nonRetryableStatuses as readonly number[];
  if (nonRetryable.includes(error.status)) {
    return false;
  }

  return error.status === 0;
};

const calculateDelay = (retryCount: number): number => {
  return RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffFactor, retryCount);
};

export const retryInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  return next(req).pipe(
    retry({
      count: RETRY_CONFIG.maxRetries,
      delay: (error: HttpErrorResponse, retryCount: number) => {

        console.warn(`[RetryInterceptor] Retry attempt ${retryCount} for ${req.url}`, {
          status: error.status,
          message: error.message
        });

        if (!shouldRetry(error)) {
          throw error;
        }

        const delay = calculateDelay(retryCount - 1);
        console.info(`[RetryInterceptor] Waiting ${delay}ms before retry...`);

        return timer(delay);
      }
    })
  );
};
