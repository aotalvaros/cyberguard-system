import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../../../infrastructure/config/env', () => ({
    config: { jwtSecret: 'test-secret' }
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn((payload: { id: string; username: string; role: string }, secret: string, options: any) => {
        return `mocked-token::${payload.id}::${payload.username}::${payload.role}`;
    }),
    verify: jest.fn((token: string, secret: string) => {
        if (token === 'invalid.token.value') {
            throw new Error('Invalid token');
        }
        const parts = token.split('::');
        return { id: parts[1], username: parts[2], role: parts[3] };
    })
}));

import jwt from 'jsonwebtoken';
import { JWTTokenService } from '../../../../infrastructure/providers/JWTTokenService';
import { logger } from '../../../../infrastructure/config/logger';

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
    const payload = { id: 'user-1', username: 'admin', role: 'user' };
    const token = service.generateToken(payload);

    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, 'test-secret');
    expect(decoded).toEqual(expect.objectContaining(payload));
  });

  it('verifyToken should return payload for a valid token', () => {
    const payload = { id: 'user-2', username: 'analyst', role: 'user' };
    const token = jwt.sign(payload, 'test-secret', { expiresIn: '8h' });

    const result = service.verifyToken(token);

    expect(result).toEqual(expect.objectContaining(payload));
  });

  it('verifyToken should return null for an invalid token', () => {
    const result = service.verifyToken('invalid.token.value');
    expect(result).toBeNull();
  });

});