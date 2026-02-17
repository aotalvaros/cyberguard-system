import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../../../config/env', () => ({
    config: { jwtSecret: 'test-secret' }
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn((payload: { username: string; role: string }, secret: string, options: any) => {
        return `mocked-token-for-${payload.username}`;
    }),
    verify: jest.fn((token: string, secret: string) => {
        if (token === 'invalid.token.value' || token === 'mocked-token-for-invalid') {
            throw new Error('Invalid token');
        }
        const username = token.replace('mocked-token-for-', '');
        return { username, role: 'user' };
    })
}));

import jwt from 'jsonwebtoken';
import { JWTTokenService } from '../../../../infrastructure/auth/JWTTokenService';
import { logger } from '../../../../config/logger';

describe('JWTTokenService', () => {
    let service: InstanceType<typeof JWTTokenService>;

    beforeEach(() => {
    service = new JWTTokenService();
    });


    afterEach(() => {
      jest.clearAllMocks();
      jest.spyOn(logger, 'error').mockRestore();
      jest.spyOn(logger, 'warn').mockRestore();
    })

  it('generateToken should return a valid JWT containing the payload', () => {
    const payload = { username: 'admin', role: 'user' };
    const token = service.generateToken(payload);

    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, 'test-secret');
    expect(decoded).toEqual(expect.objectContaining(payload));
  });

  it('verifyToken should return payload for a valid token', () => {
    const payload = { username: 'analyst', role: 'user' };
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '8h' });

    const result = service.verifyToken(token);

    expect(result).toEqual(expect.objectContaining(payload));
  });

  it('verifyToken should return null for an invalid token', () => {
    const result = service.verifyToken('invalid.token.value');
    expect(result).toBeNull();
  });

});