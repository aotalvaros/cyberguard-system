// Tipo de prueba: Unitario
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  AppErrorType, 
  AppError, 
  createAppError 
} from '../global-error.handler';

describe('GlobalErrorHandler', () => {
  describe('createAppError', () => {
    it('should create AppError with all properties', () => {
      const originalError = new Error('Original');
      const error = createAppError(
        AppErrorType.SERVER,
        'Server error',
        originalError,
        500
      );

      expect(error.type).toBe(AppErrorType.SERVER);
      expect(error.message).toBe('Server error');
      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBe(500);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create AppError without optional properties', () => {
      const error = createAppError(AppErrorType.UNKNOWN, 'Unknown error');

      expect(error.type).toBe(AppErrorType.UNKNOWN);
      expect(error.message).toBe('Unknown error');
      expect(error.originalError).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
    });

    it('should set timestamp to current date', () => {
      const before = new Date();
      const error = createAppError(AppErrorType.NETWORK, 'Network error');
      const after = new Date();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should create AUTHENTICATION error', () => {
      const error = createAppError(AppErrorType.AUTHENTICATION, 'Session expired', undefined, 401);
      expect(error.type).toBe(AppErrorType.AUTHENTICATION);
      expect(error.statusCode).toBe(401);
    });

    it('should create AUTHORIZATION error', () => {
      const error = createAppError(AppErrorType.AUTHORIZATION, 'Access denied', undefined, 403);
      expect(error.type).toBe(AppErrorType.AUTHORIZATION);
      expect(error.statusCode).toBe(403);
    });

    it('should create VALIDATION error', () => {
      const error = createAppError(AppErrorType.VALIDATION, 'Invalid input', undefined, 400);
      expect(error.type).toBe(AppErrorType.VALIDATION);
      expect(error.statusCode).toBe(400);
    });

    it('should create NETWORK error', () => {
      const error = createAppError(AppErrorType.NETWORK, 'Network error');
      expect(error.type).toBe(AppErrorType.NETWORK);
      expect(error.statusCode).toBeUndefined();
    });

    it('should preserve original error reference', () => {
      const originalError = new Error('Original error');
      originalError.stack = 'Stack trace';
      const error = createAppError(AppErrorType.UNKNOWN, 'Wrapped error', originalError);
      
      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.stack).toBe('Stack trace');
    });
  });

  describe('AppErrorType enum', () => {
    it('should have all expected error types', () => {
      expect(AppErrorType.NETWORK).toBe('NETWORK');
      expect(AppErrorType.AUTHENTICATION).toBe('AUTHENTICATION');
      expect(AppErrorType.AUTHORIZATION).toBe('AUTHORIZATION');
      expect(AppErrorType.VALIDATION).toBe('VALIDATION');
      expect(AppErrorType.SERVER).toBe('SERVER');
      expect(AppErrorType.UNKNOWN).toBe('UNKNOWN');
    });

    it('should have exactly 6 error types', () => {
      const errorTypes = Object.keys(AppErrorType);
      expect(errorTypes).toHaveLength(6);
    });
  });

  describe('AppError interface compliance', () => {
    it('should create valid AppError structure', () => {
      const error = createAppError(AppErrorType.SERVER, 'Test');
      
      // Check all required properties exist
      expect(error).toHaveProperty('type');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('timestamp');
      
      // Check types
      expect(typeof error.type).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should allow readonly access to properties', () => {
      const error = createAppError(AppErrorType.NETWORK, 'Network issue');
      
      // Verify properties are accessible
      const type: AppErrorType = error.type;
      const message: string = error.message;
      const timestamp: Date = error.timestamp;
      
      expect(type).toBe(AppErrorType.NETWORK);
      expect(message).toBe('Network issue');
      expect(timestamp).toBeInstanceOf(Date);
    });
  });
});
