import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
import { config } from '../config/env';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('authMiddleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any
    };
    nextFunction = jest.fn() as any;
  });

  it('should return 401 if Authorization header is missing', () => {
    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authorization header missing' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is missing', () => {
    mockRequest.headers = { authorization: 'Bearer ' };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token missing' });
  });

  it('should return 401 if token is invalid', () => {
    mockRequest.headers = { authorization: 'Bearer invalid-token' };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('should return 401 if token is expired', () => {
    const expiredToken = jwt.sign(
      { username: 'admin', role: 'admin' },
      config.jwtSecret,
      { expiresIn: '-1h' }
    );

    mockRequest.headers = { authorization: `Bearer ${expiredToken}` };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Token expired' });
  });

  it('should call next() and add user to request with valid token', () => {
    const validToken = jwt.sign(
      { username: 'admin', role: 'admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    mockRequest.headers = { authorization: `Bearer ${validToken}` };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.username).toBe('admin');
    expect(mockRequest.user?.role).toBe('admin');
  });

  it('should work with token without Bearer prefix', () => {
    const validToken = jwt.sign(
      { username: 'admin', role: 'admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    mockRequest.headers = { authorization: validToken };

    authMiddleware(mockRequest as AuthRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalled();
    expect(mockRequest.user).toBeDefined();
  });
});
