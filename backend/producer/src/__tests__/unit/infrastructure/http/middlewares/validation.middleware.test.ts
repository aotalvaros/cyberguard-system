import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../../../../infrastructure/config/logger', () => ({
  logger: mockLogger,
}));

import { validate } from '../../../../../infrastructure/http/middlewares/validation.middleware';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  const testSchema = Joi.object({
    name: Joi.string().min(3).required(),
    age: Joi.number().integer().min(0).required(),
    email: Joi.string().email().optional(),
  }).options({ abortEarly: false, stripUnknown: true });

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as unknown as Response['status'],
      json: jest.fn().mockReturnThis() as unknown as Response['json'],
    };

    nextFunction = jest.fn() as NextFunction;
  });

  describe('Valid Input', () => {
    it('should call next() when body is valid', () => {
      mockRequest.body = { name: 'John', age: 30 };

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should set req.body to validated value (stripped unknown fields)', () => {
      mockRequest.body = { name: 'John', age: 30, unknownField: 'should be removed' };

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.body).toEqual({ name: 'John', age: 30 });
      expect(mockRequest.body).not.toHaveProperty('unknownField');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should pass through optional fields when provided', () => {
      mockRequest.body = { name: 'John', age: 30, email: 'john@example.com' };

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.body).toEqual({
        name: 'John',
        age: 30,
        email: 'john@example.com',
      });
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('Invalid Input', () => {
    it('should return 400 when required field is missing', () => {
      mockRequest.body = { age: 30 };

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: 'name' }),
          ]),
        })
      );
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return all errors when multiple fields are invalid', () => {
      mockRequest.body = {};

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0] as unknown[];
      const responseBody = jsonCall[0] as { details: Array<{ field: string }> };
      expect(responseBody.details.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 400 when field value violates constraint', () => {
      mockRequest.body = { name: 'Jo', age: 30 };

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should log validation warning with details', () => {
      mockRequest.body = { age: -1 };

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Validation failed',
        expect.objectContaining({
          details: expect.any(Array),
        })
      );
    });

    it('should include field path and message in error details', () => {
      mockRequest.body = { name: 'Jo', age: 30 };

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0] as unknown[];
      const responseBody = jsonCall[0] as { details: Array<{ field: string; message: string }> };
      const detail = responseBody.details[0];
      expect(detail).toHaveProperty('field');
      expect(detail).toHaveProperty('message');
      expect(typeof detail.field).toBe('string');
      expect(typeof detail.message).toBe('string');
    });
  });

  describe('Response Structure', () => {
    it('should return consistent error structure', () => {
      mockRequest.body = {};

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.any(Array),
      });
    });

    it('should not call next() on validation failure', () => {
      mockRequest.body = { name: 123, age: 'not a number' };

      validate(testSchema)(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});
