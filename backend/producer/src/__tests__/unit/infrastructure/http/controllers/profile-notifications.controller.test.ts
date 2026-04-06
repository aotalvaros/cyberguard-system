/**
 * Unit Tests: profile-notifications.controller.ts
 *
 * VERIFICAR: GET  / retorna 200 con preferencias.
 * VERIFICAR: PUT  / retorna 200 con body válido.
 * VALIDAR:   PUT  / retorna 400 cuando email activo pero vacío.
 * VALIDAR:   PUT  / retorna 400 cuando phone tiene formato inválido.
 * VALIDAR:   GET  / retorna 500 ante error interno.
 * VALIDAR:   PUT  / retorna 500 ante error del use case.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const mockGetExecute = jest.fn<AsyncFn>();
const mockSaveExecute = jest.fn<AsyncFn>();

jest.mock('../../../../../infrastructure/config/logger', () => ({ logger: mockLogger }));
jest.mock('../../../../../infrastructure/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getGetNotifPrefsUseCase: jest.fn(() => ({ execute: mockGetExecute })),
    getSaveNotifPrefsUseCase: jest.fn(() => ({ execute: mockSaveExecute })),
  },
}));
jest.mock('../../../../../infrastructure/http/middlewares/auth.middleware', () => ({
  authMiddleware: jest.fn(),
}));

import { profileNotificationsRouter } from '../../../../../infrastructure/http/controllers/profile-notifications.controller';
import { authMiddleware } from '../../../../../infrastructure/http/middlewares/auth.middleware';

const mockAuth = authMiddleware as jest.MockedFunction<
  (req: Request, res: Response, next: NextFunction) => void
>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeApp(username: string = 'admin', role: string = 'admin'): Express {
  const app = express();
  app.use(express.json());
  mockAuth.mockImplementation((req, _res, next) => {
    (req as Request & { user: { username: string; role: string } }).user = { username, role };
    next();
  });
  app.use('/api/profile/notification-preferences', profileNotificationsRouter);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('profile-notifications.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── GET / ─────────────────────────────────────────────────────────────────
  describe('GET /api/profile/notification-preferences', () => {
    it('should return 200 with preferences', async () => {
      const prefs = {
        username: 'admin',
        emailEnabled: true,
        whatsappEnabled: false,
        email: 'admin@example.com',
        phone: '',
      };
      mockGetExecute.mockResolvedValueOnce(prefs);

      const res = await request(makeApp())
        .get('/api/profile/notification-preferences');

      expect(res.status).toBe(200);
      expect(res.body.emailEnabled).toBe(true);
      expect(res.body.email).toBe('admin@example.com');
    });

    it('should return 500 on internal error', async () => {
      mockGetExecute.mockRejectedValueOnce(new Error('DB crash'));

      const res = await request(makeApp())
        .get('/api/profile/notification-preferences');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });

  // ── PUT / ─────────────────────────────────────────────────────────────────
  describe('PUT /api/profile/notification-preferences', () => {
    it('should return 200 on valid body', async () => {
      mockSaveExecute.mockResolvedValueOnce(undefined);

      const res = await request(makeApp())
        .put('/api/profile/notification-preferences')
        .send({ emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('updated');
    });

    it('should return 400 when email required but missing', async () => {
      const res = await request(makeApp())
        .put('/api/profile/notification-preferences')
        .send({ emailEnabled: true, whatsappEnabled: false, email: '', phone: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('should return 400 when phone required but invalid format', async () => {
      const res = await request(makeApp())
        .put('/api/profile/notification-preferences')
        .send({ emailEnabled: false, whatsappEnabled: true, email: '', phone: 'no-phone' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('should return 500 on use case error', async () => {
      mockSaveExecute.mockRejectedValueOnce(new Error('Redis down'));

      const res = await request(makeApp())
        .put('/api/profile/notification-preferences')
        .send({ emailEnabled: false, whatsappEnabled: false, email: '', phone: '' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Internal server error');
    });
  });
});
