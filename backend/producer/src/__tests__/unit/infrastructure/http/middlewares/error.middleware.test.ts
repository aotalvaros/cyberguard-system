import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

jest.unstable_mockModule('../../../../../infrastructure/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import { logger } from '../../../../../infrastructure/config/logger';
import { errorHandler } from '../../../../../infrastructure/http/middlewares/error.middleware';


describe('Error Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      method: 'POST',
      path: '/api/test'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any
    };
    nextFunction = jest.fn() as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.spyOn(logger, 'error').mockRestore();
    jest.spyOn(logger, 'warn').mockRestore();
  });

  describe('Error Handling', () => {
    it('should return 500 for generic errors', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    it('should not expose stack trace in response', () => {
      const error = new Error('Sensitive error');
      error.stack = 'Error: Sensitive error\n    at secret/path/file.ts:123';

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('stack');
      expect(JSON.stringify(jsonCall)).not.toContain('secret/path');
    });

    it('should handle errors without message', () => {
      const error = new Error();

      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });
  });
});