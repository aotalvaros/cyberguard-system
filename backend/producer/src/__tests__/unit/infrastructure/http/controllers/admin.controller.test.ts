/**
 * Unit Tests: admin.controller.ts
 *
 * VERIFICAR: PATCH /users/:username/role actualiza el rol y retorna el usuario.
 * VERIFICAR: GET  /users lista todos los usuarios sin datos sensibles.
 * VALIDAR:   requireAdmin middleware bloquea con 403 a no-admins.
 * VALIDAR:   Se rechaza rol inválido con 400 antes de llamar al repositorio.
 * VALIDAR:   Se retorna 404 cuando el usuario no existe.
 * VALIDAR:   No se permite que un admin se quite su propio rol admin.
 * VALIDAR:   Se retorna 500 genérico sin exponer detalles internos.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const mockFindByUsername = jest.fn<AsyncFn>();
const mockUpdate         = jest.fn<AsyncFn>();
const mockFindAll        = jest.fn<AsyncFn>();
const mockUserRepository = {
  findByUsername: mockFindByUsername,
  update:         mockUpdate,
  findAll:        mockFindAll,
};

jest.mock('../../../../../infrastructure/config/logger', () => ({ logger: mockLogger }));
jest.mock('../../../../../infrastructure/factories/ServiceFactory', () => ({
  ServiceFactory: { getUserRepository: jest.fn(() => mockUserRepository) },
}));
jest.mock('../../../../../infrastructure/http/middlewares/auth.middleware', () => ({
  authMiddleware: jest.fn(),
}));

import adminRouter from '../../../../../infrastructure/http/controllers/admin.controller';
import { authMiddleware } from '../../../../../infrastructure/http/middlewares/auth.middleware';

// Helper to cast the mocked middleware
const mockAuth = authMiddleware as jest.MockedFunction<
  (req: Request, res: Response, next: NextFunction) => void
>;

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeApp(userRole: string = 'admin', username: string = 'admin-user'): Express {
  const app = express();
  app.use(express.json());
  mockAuth.mockImplementation((req, _res, next) => {
    (req as Request & { user: { role: string; username: string } }).user = { role: userRole, username };
    next();
  });
  app.use('/admin', adminRouter);
  return app;
}

const baseUser = {
  id:             'user-id-1',
  username:       'bob',
  email:          'bob@example.com',
  role:           'analyst',
  isLocked:       false,
  failedAttempts: 0,
  lastLogin:      null,
  createdAt:      new Date('2026-01-01'),
  updatedAt:      new Date('2026-02-01'),
};

// ─────────────────────────────────────────────────────────────────────────────

describe('admin.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── PATCH /users/:username/role ──────────────────────────────────────────
  describe('PATCH /admin/users/:username/role', () => {
    it('should return 200 and updated user when role is valid', async () => {
      const updatedUser = { ...baseUser, role: 'viewer', updatedAt: new Date('2026-02-25') };
      mockFindByUsername.mockResolvedValueOnce(baseUser);
      mockUpdate.mockResolvedValueOnce(updatedUser);

      const res = await request(makeApp())
        .patch('/admin/users/bob/role')
        .send({ role: 'viewer' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('viewer');
    });

    it('should return 403 when the requesting user is not an admin', async () => {
      const res = await request(makeApp('analyst'))
        .patch('/admin/users/bob/role')
        .send({ role: 'viewer' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('admin');
      expect(mockFindByUsername).not.toHaveBeenCalled();
    });

    it('should return 400 when role is not a valid enum value', async () => {
      const res = await request(makeApp())
        .patch('/admin/users/bob/role')
        .send({ role: 'superuser' }); // not in ['admin','analyst','viewer']

      expect(res.status).toBe(400);
      expect(mockFindByUsername).not.toHaveBeenCalled();
    });

    it('should return 400 when role field is missing from body', async () => {
      const res = await request(makeApp())
        .patch('/admin/users/bob/role')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 404 when user does not exist', async () => {
      mockFindByUsername.mockResolvedValueOnce(null);

      const res = await request(makeApp())
        .patch('/admin/users/ghost/role')
        .send({ role: 'viewer' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('ghost');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should return 400 when admin tries to downgrade their own role', async () => {
      // admin-user is the requesting user AND the target username
      mockFindByUsername.mockResolvedValueOnce({ ...baseUser, username: 'admin-user' });

      const res = await request(makeApp('admin', 'admin-user'))
        .patch('/admin/users/admin-user/role')
        .send({ role: 'analyst' }); // downgrade from admin

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('downgrade');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should allow admin to change a different user\'s role', async () => {
      const updatedUser = { ...baseUser, role: 'admin', updatedAt: new Date() };
      mockFindByUsername.mockResolvedValueOnce(baseUser); // target: bob
      mockUpdate.mockResolvedValueOnce(updatedUser);

      // admin-user is the requester, bob is the target → no self-downgrade
      const res = await request(makeApp('admin', 'admin-user'))
        .patch('/admin/users/bob/role')
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
    });

    it('should return 500 without internal details when repository throws', async () => {
      mockFindByUsername.mockRejectedValueOnce(new Error('db connection lost'));

      const res = await request(makeApp())
        .patch('/admin/users/bob/role')
        .send({ role: 'viewer' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update role');
      // VALIDAR: internal error message must NOT be exposed
      expect(JSON.stringify(res.body)).not.toContain('db connection lost');
    });

    it('should log the role change on success', async () => {
      const updatedUser = { ...baseUser, role: 'viewer', updatedAt: new Date() };
      mockFindByUsername.mockResolvedValueOnce(baseUser);
      mockUpdate.mockResolvedValueOnce(updatedUser);

      await request(makeApp()).patch('/admin/users/bob/role').send({ role: 'viewer' });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User role updated',
        expect.objectContaining({ username: 'bob', newRole: 'viewer' }),
      );
    });
  });

  // ── GET /users ────────────────────────────────────────────────────────────
  describe('GET /admin/users', () => {
    it('should return 200 with user list', async () => {
      mockFindAll.mockResolvedValueOnce([baseUser]);

      const res = await request(makeApp()).get('/admin/users');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].username).toBe('bob');
    });

    it('should return 200 with empty list when no users exist', async () => {
      mockFindAll.mockResolvedValueOnce([]);

      const res = await request(makeApp()).get('/admin/users');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.users).toHaveLength(0);
    });

    it('should NOT expose sensitive fields like email in the response', async () => {
      mockFindAll.mockResolvedValueOnce([baseUser]);

      const res = await request(makeApp()).get('/admin/users');

      // email is sensitive — the controller should not include it
      expect(res.body.users[0]).not.toHaveProperty('email');
    });

    it('should return 403 when the requesting user is not an admin', async () => {
      const res = await request(makeApp('viewer')).get('/admin/users');

      expect(res.status).toBe(403);
      expect(mockFindAll).not.toHaveBeenCalled();
    });

    it('should return 500 without internal details when repository throws', async () => {
      mockFindAll.mockRejectedValueOnce(new Error('table missing'));

      const res = await request(makeApp()).get('/admin/users');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to retrieve users');
      expect(JSON.stringify(res.body)).not.toContain('table missing');
    });
  });
});
