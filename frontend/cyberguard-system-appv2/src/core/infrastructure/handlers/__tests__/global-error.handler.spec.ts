// Tipo de prueba: Unitario
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AppErrorType,
  AppError,
  createAppError,
  GlobalErrorHandler
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

describe('GlobalErrorHandler class', () => {
  let handler: GlobalErrorHandler;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockRouter = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        GlobalErrorHandler,
        provideRouter([]),
        { provide: Router, useValue: mockRouter },
        { provide: NgZone, useValue: { run: vi.fn((fn: () => void) => fn()) } },
      ],
    });

    handler = TestBed.inject(GlobalErrorHandler);
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe('handleError — already-normalized AppError input', () => {
    it('should log error to console', () => {
      const error = createAppError(AppErrorType.UNKNOWN, 'test error');
      handler.handleError(error as unknown as Error);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should redirect to /autenticacion on AUTHENTICATION AppError', () => {
      const error = createAppError(AppErrorType.AUTHENTICATION, 'Session expired', undefined, 401);
      handler.handleError(error as unknown as Error);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
    });

    it('should NOT navigate on AUTHORIZATION AppError', () => {
      const error = createAppError(AppErrorType.AUTHORIZATION, 'Forbidden', undefined, 403);
      handler.handleError(error as unknown as Error);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should NOT navigate on NETWORK AppError', () => {
      const error = createAppError(AppErrorType.NETWORK, 'Network error');
      handler.handleError(error as unknown as Error);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should NOT navigate on SERVER AppError', () => {
      const error = createAppError(AppErrorType.SERVER, 'Server error', undefined, 500);
      handler.handleError(error as unknown as Error);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should NOT navigate on VALIDATION AppError', () => {
      const error = createAppError(AppErrorType.VALIDATION, 'Invalid input', undefined, 400);
      handler.handleError(error as unknown as Error);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should NOT navigate on UNKNOWN AppError', () => {
      const error = createAppError(AppErrorType.UNKNOWN, 'Mystery error');
      handler.handleError(error as unknown as Error);
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('normalizeError — plain Error input', () => {
    it('should detect 401 / Unauthorized in message and redirect', () => {
      handler.handleError(new Error('HTTP 401 Unauthorized'));
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
    });

    it('should detect Forbidden in message as AUTHORIZATION (no redirect)', () => {
      handler.handleError(new Error('403 Forbidden'));
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should detect Network in message as NETWORK type', () => {
      handler.handleError(new Error('Network request failed'));
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should detect Failed to fetch as NETWORK type', () => {
      handler.handleError(new Error('Failed to fetch resource'));
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should detect 500 in message as SERVER type', () => {
      handler.handleError(new Error('Internal Server Error 500'));
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should detect Server in message as SERVER type', () => {
      handler.handleError(new Error('Server is down'));
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should fall through to UNKNOWN for unrecognized error message', () => {
      handler.handleError(new Error('Something went wrong unexpectedly'));
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should handle error with empty message as UNKNOWN', () => {
      handler.handleError(new Error(''));
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('handleError — AUTHENTICATION removes tokens from localStorage', () => {
    it('should call localStorage.removeItem for TOKEN and USER', () => {
      const removeSpy = vi.spyOn(Storage.prototype, 'removeItem');
      const error = createAppError(AppErrorType.AUTHENTICATION, 'Session expired', undefined, 401);
      handler.handleError(error as unknown as Error);
      expect(removeSpy).toHaveBeenCalledTimes(2);
    });
  });
});
