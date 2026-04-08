/**
 * Unit Tests: profile.controller.ts
 *
 * VERIFICAR: GET  / retorna 200 con perfil.
 * VERIFICAR: GET  / retorna domainError status correcto.
 * VERIFICAR: GET  / retorna 500 ante error genérico (Error instance).
 * VERIFICAR: GET  / retorna 500 ante error genérico (non-Error).
 * VERIFICAR: PATCH / retorna 200 con perfil actualizado.
 * VERIFICAR: PATCH / retorna domainError status correcto.
 * VERIFICAR: PATCH / retorna 500 ante error genérico (Error instance).
 * VERIFICAR: PATCH / retorna 500 ante error genérico (non-Error).
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const mockGetExecute = jest.fn<AsyncFn>();
const mockUpdateExecute = jest.fn<AsyncFn>();

jest.mock('../../../../../infrastructure/config/logger', () => ({ logger: mockLogger }));
jest.mock('../../../../../infrastructure/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getGetAdminProfileUseCase: jest.fn(() => ({ execute: mockGetExecute })),
    getUpdateAdminProfileUseCase: jest.fn(() => ({ execute: mockUpdateExecute })),
  },
}));
jest.mock('../../../../../infrastructure/http/middlewares/auth.middleware', () => ({
  authMiddleware: jest.fn(),
}));
jest.mock('../../../../../infrastructure/http/middlewares/validation.middleware', () => ({
  validate: jest.fn(() => (req: Request, _res: Response, next: NextFunction) => next()),
}));

import profileRouter from '../../../../../infrastructure/http/controllers/profile.controller';
import { authMiddleware } from '../../../../../infrastructure/http/middlewares/auth.middleware';
import { ProfileNotFoundException } from '../../../../../domain/exceptions/ProfileNotFoundException';
import { EmailAlreadyExistsException } from '../../../../../domain/exceptions/EmailAlreadyExistsException';
import { RoleModificationNotAllowedException } from '../../../../../domain/exceptions/RoleModificationNotAllowedException';
import { DomainError } from '../../../../../domain/exceptions/DomainError';

// Concrete subclass for testing unknown error codes
class TestDomainError extends DomainError {
  constructor(message: string, code: string) {
    super(message, code);
  }
}

const mockAuth = authMiddleware as jest.MockedFunction<
  (req: Request, res: Response, next: NextFunction) => void
>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeApp(username = 'admin', role = 'admin'): Express {
  const app = express();
  app.use(express.json());
  mockAuth.mockImplementation((req, _res, next) => {
    (req as Request & { user: { username: string; role: string } }).user = { username, role };
    next();
  });
  app.use('/api/profile', profileRouter);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('profile.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET / ─────────────────────────────────────────────────────────────────
  describe('GET /api/profile', () => {
    it('should return 200 with profile data', async () => {
      const profile = { username: 'admin', email: 'admin@test.com', role: 'admin' };
      mockGetExecute.mockResolvedValueOnce(profile);

      const res = await request(makeApp()).get('/api/profile');

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('admin');
    });

    it('should return 404 for PROFILE_NOT_FOUND domain error', async () => {
      mockGetExecute.mockRejectedValueOnce(new ProfileNotFoundException('admin'));

      const res = await request(makeApp()).get('/api/profile');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('PROFILE_NOT_FOUND');
    });

    it('should return 409 for EMAIL_ALREADY_EXISTS domain error', async () => {
      mockGetExecute.mockRejectedValueOnce(new EmailAlreadyExistsException('test@test.com'));

      const res = await request(makeApp()).get('/api/profile');

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should return 400 for ROLE_MODIFICATION_NOT_ALLOWED domain error', async () => {
      mockGetExecute.mockRejectedValueOnce(new RoleModificationNotAllowedException());

      const res = await request(makeApp()).get('/api/profile');

      expect(res.status).toBe(400);
    });

    it('should return 400 for unknown domain error code (default map)', async () => {
      mockGetExecute.mockRejectedValueOnce(new TestDomainError('Some error', 'UNKNOWN_CODE'));

      const res = await request(makeApp()).get('/api/profile');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('UNKNOWN_CODE');
    });

    it('should return 500 with Error instance', async () => {
      mockGetExecute.mockRejectedValueOnce(new Error('DB crash'));

      const res = await request(makeApp()).get('/api/profile');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'GetAdminProfile unexpected error',
        expect.objectContaining({ error: 'DB crash' }),
      );
    });

    it('should return 500 with non-Error value', async () => {
      mockGetExecute.mockRejectedValueOnce('string crash');

      const res = await request(makeApp()).get('/api/profile');

      expect(res.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'GetAdminProfile unexpected error',
        expect.objectContaining({ error: 'string crash' }),
      );
    });
  });

  // ── PATCH / ───────────────────────────────────────────────────────────────
  describe('PATCH /api/profile', () => {
    it('should return 200 with updated profile', async () => {
      const updated = { username: 'admin', email: 'new@test.com', role: 'admin' };
      mockUpdateExecute.mockResolvedValueOnce(updated);

      const res = await request(makeApp())
        .patch('/api/profile')
        .send({ email: 'new@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('new@test.com');
      expect(mockLogger.info).toHaveBeenCalledWith('Profile updated', expect.objectContaining({ username: 'admin' }));
    });

    it('should return 404 for PROFILE_NOT_FOUND domain error', async () => {
      mockUpdateExecute.mockRejectedValueOnce(new ProfileNotFoundException('admin'));

      const res = await request(makeApp())
        .patch('/api/profile')
        .send({ email: 'new@test.com' });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('PROFILE_NOT_FOUND');
    });

    it('should return 500 with Error instance', async () => {
      mockUpdateExecute.mockRejectedValueOnce(new Error('Update failed'));

      const res = await request(makeApp())
        .patch('/api/profile')
        .send({ email: 'new@test.com' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'UpdateAdminProfile unexpected error',
        expect.objectContaining({ error: 'Update failed' }),
      );
    });

    it('should return 500 with non-Error value', async () => {
      mockUpdateExecute.mockRejectedValueOnce(42);

      const res = await request(makeApp())
        .patch('/api/profile')
        .send({ email: 'new@test.com' });

      expect(res.status).toBe(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'UpdateAdminProfile unexpected error',
        expect.objectContaining({ error: '42' }),
      );
    });
  });
});
