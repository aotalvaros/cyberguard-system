/**
 * Unit Tests: admin.controller.ts (IRMS — HU-008)
 *
 * VERIFICAR: POST   /users              crea usuario → 201
 * VERIFICAR: GET    /users              lista usuarios → 200
 * VERIFICAR: GET    /users/:id          retorna usuario por id → 200
 * VERIFICAR: PUT    /users/:id          modifica nombre/rol → 200
 * VERIFICAR: PATCH  /users/:id/status   activa/desactiva usuario → 200
 * VALIDAR:   requireAdmin bloquea con 403 a no-admins.
 * VALIDAR:   Joi rechaza payloads inválidos con 400.
 * VALIDAR:   Errores de dominio se mapean a HTTP correcto (409, 404, 400).
 * VALIDAR:   Se retorna 500 sin exponer detalles internos.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

// ── Logger mock ──────────────────────────────────────────────────────────────
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
jest.mock('../../../../../infrastructure/config/logger', () => ({ logger: mockLogger }));

// ── Use-case mocks ───────────────────────────────────────────────────────────
type AsyncFn = (...args: unknown[]) => Promise<unknown>;

const mockCreateExecute  = jest.fn<AsyncFn>();
const mockListExecute    = jest.fn<AsyncFn>();
const mockUpdateExecute  = jest.fn<AsyncFn>();
const mockToggleExecute  = jest.fn<AsyncFn>();
const mockFindById       = jest.fn<AsyncFn>();

jest.mock('../../../../../infrastructure/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getCreateUserUseCase:       jest.fn(() => ({ execute: mockCreateExecute })),
    getListUsersUseCase:        jest.fn(() => ({ execute: mockListExecute })),
    getUpdateUserUseCase:       jest.fn(() => ({ execute: mockUpdateExecute })),
    getToggleUserStatusUseCase: jest.fn(() => ({ execute: mockToggleExecute })),
    getUserRepository:          jest.fn(() => ({ findById: mockFindById })),
  },
}));

jest.mock('../../../../../infrastructure/http/middlewares/auth.middleware', () => ({
  authMiddleware: jest.fn(),
}));

import adminRouter from '../../../../../infrastructure/http/controllers/admin.controller';
import { authMiddleware } from '../../../../../infrastructure/http/middlewares/auth.middleware';
import { UserAlreadyExistsError }         from '../../../../../domain/exceptions/UserAlreadyExistsError';
import { UserNotFoundError }              from '../../../../../domain/exceptions/UserNotFoundError';
import { SelfModificationForbiddenError } from '../../../../../domain/exceptions/SelfModificationForbiddenError';

// ── Auth mock helper ─────────────────────────────────────────────────────────
const mockAuth = authMiddleware as jest.MockedFunction<
  (req: Request, res: Response, next: NextFunction) => void
>;

function makeApp(role = 'admin', id = 'admin-uid-1'): Express {
  const app = express();
  app.use(express.json());
  mockAuth.mockImplementation((req, _res, next) => {
    (req as Request & { user: { id: string; role: string; username: string } }).user = {
      id,
      role,
      username: 'admin-user',
    };
    next();
  });
  app.use('/admin', adminRouter);
  return app;
}

// ── Shared fixtures ──────────────────────────────────────────────────────────
const baseUser = {
  id:             'user-id-1',
  username:       'bob',
  email:          'bob@example.com',
  role:           'soc_analyst',
  fullName:       'Bob Smith',
  phone:          null,
  isActive:       true,
  isLocked:       false,
  failedAttempts: 0,
  lastLogin:      null,
  createdAt:      new Date('2026-01-01'),
  updatedAt:      new Date('2026-02-01'),
};

const validCreatePayload = {
  email:    'bob@example.com',
  fullName: 'Bob Smith',
  role:     'soc_analyst',
  username: 'bob',
};

// ─────────────────────────────────────────────────────────────────────────────

describe('admin.controller (IRMS)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /admin/users ──────────────────────────────────────────────────────
  describe('POST /admin/users', () => {
    it('should return 201 and created user on success', async () => {
      mockCreateExecute.mockResolvedValueOnce({ user: baseUser });

      const res = await request(makeApp())
        .post('/admin/users')
        .send(validCreatePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.username).toBe('bob');
    });

    it('should return 403 when requester is not admin', async () => {
      const res = await request(makeApp('soc_analyst'))
        .post('/admin/users')
        .send(validCreatePayload);

      expect(res.status).toBe(403);
      expect(mockCreateExecute).not.toHaveBeenCalled();
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(makeApp())
        .post('/admin/users')
        .send({ fullName: 'Bob', role: 'soc_analyst', username: 'bob' });

      expect(res.status).toBe(400);
      expect(mockCreateExecute).not.toHaveBeenCalled();
    });

    it('should return 400 when role is not a valid IRMS role', async () => {
      const res = await request(makeApp())
        .post('/admin/users')
        .send({ ...validCreatePayload, role: 'superuser' });

      expect(res.status).toBe(400);
      expect(mockCreateExecute).not.toHaveBeenCalled();
    });

    it('should return 409 when email is already in use', async () => {
      mockCreateExecute.mockRejectedValueOnce(
        new UserAlreadyExistsError('bob@example.com')
      );

      const res = await request(makeApp())
        .post('/admin/users')
        .send(validCreatePayload);

      expect(res.status).toBe(409);
    });

    it('should return 500 without internal details when use case throws', async () => {
      mockCreateExecute.mockRejectedValueOnce(new Error('db gone'));

      const res = await request(makeApp())
        .post('/admin/users')
        .send(validCreatePayload);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create user');
      expect(JSON.stringify(res.body)).not.toContain('db gone');
    });
  });

  // ── GET /admin/users ───────────────────────────────────────────────────────
  describe('GET /admin/users', () => {
    it('should return 200 with user list', async () => {
      mockListExecute.mockResolvedValueOnce({ users: [baseUser], total: 1 });

      const res = await request(makeApp()).get('/admin/users');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].username).toBe('bob');
    });

    it('should return 200 with empty list when no users', async () => {
      mockListExecute.mockResolvedValueOnce({ users: [], total: 0 });

      const res = await request(makeApp()).get('/admin/users');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.users).toHaveLength(0);
    });

    it('should return 403 when requester is not admin', async () => {
      const res = await request(makeApp('incident_handler')).get('/admin/users');

      expect(res.status).toBe(403);
      expect(mockListExecute).not.toHaveBeenCalled();
    });

    it('should return 500 without internal details when use case throws', async () => {
      mockListExecute.mockRejectedValueOnce(new Error('table missing'));

      const res = await request(makeApp()).get('/admin/users');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to retrieve users');
      expect(JSON.stringify(res.body)).not.toContain('table missing');
    });
  });

  // ── GET /admin/users/:id ───────────────────────────────────────────────────
  describe('GET /admin/users/:id', () => {
    it('should return 200 with user when found', async () => {
      mockFindById.mockResolvedValueOnce(baseUser);

      const res = await request(makeApp()).get('/admin/users/user-id-1');

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe('user-id-1');
    });

    it('should return 404 when user does not exist', async () => {
      mockFindById.mockResolvedValueOnce(null);

      const res = await request(makeApp()).get('/admin/users/ghost-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('ghost-id');
    });

    it('should return 403 when requester is not admin', async () => {
      const res = await request(makeApp('ciso')).get('/admin/users/user-id-1');

      expect(res.status).toBe(403);
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it('should return 500 on repository error', async () => {
      mockFindById.mockRejectedValueOnce(new Error('conn lost'));

      const res = await request(makeApp()).get('/admin/users/user-id-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to retrieve user');
    });
  });

  // ── PUT /admin/users/:id ───────────────────────────────────────────────────
  describe('PUT /admin/users/:id', () => {
    it('should return 200 and updated user on success', async () => {
      const updated = { ...baseUser, fullName: 'Robert Smith' };
      mockUpdateExecute.mockResolvedValueOnce({ user: updated });

      const res = await request(makeApp())
        .put('/admin/users/user-id-1')
        .send({ fullName: 'Robert Smith' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.fullName).toBe('Robert Smith');
    });

    it('should return 400 on empty body (no fields to update)', async () => {
      const res = await request(makeApp())
        .put('/admin/users/user-id-1')
        .send({});

      expect(res.status).toBe(400);
      expect(mockUpdateExecute).not.toHaveBeenCalled();
    });

    it('should return 400 when role is invalid', async () => {
      const res = await request(makeApp())
        .put('/admin/users/user-id-1')
        .send({ role: 'god_mode' });

      expect(res.status).toBe(400);
      expect(mockUpdateExecute).not.toHaveBeenCalled();
    });

    it('should return 403 when requester is not admin', async () => {
      const res = await request(makeApp('soc_analyst'))
        .put('/admin/users/user-id-1')
        .send({ fullName: 'New Name' });

      expect(res.status).toBe(403);
      expect(mockUpdateExecute).not.toHaveBeenCalled();
    });

    it('should return 404 when user does not exist', async () => {
      mockUpdateExecute.mockRejectedValueOnce(
        new UserNotFoundError('user-id-ghost')
      );

      const res = await request(makeApp())
        .put('/admin/users/user-id-ghost')
        .send({ role: 'ciso' });

      expect(res.status).toBe(404);
    });

    it('should return 400 when admin tries to change their own role', async () => {
      mockUpdateExecute.mockRejectedValueOnce(
        new SelfModificationForbiddenError('role_change')
      );

      const res = await request(makeApp('admin', 'admin-uid-1'))
        .put('/admin/users/admin-uid-1')
        .send({ role: 'soc_analyst' });

      expect(res.status).toBe(400);
    });

    it('should return 500 without internal details when use case throws', async () => {
      mockUpdateExecute.mockRejectedValueOnce(new Error('disk full'));

      const res = await request(makeApp())
        .put('/admin/users/user-id-1')
        .send({ role: 'ciso' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update user');
      expect(JSON.stringify(res.body)).not.toContain('disk full');
    });
  });

  // ── PATCH /admin/users/:id/status ─────────────────────────────────────────
  describe('PATCH /admin/users/:id/status', () => {
    it('should return 200 and deactivated user on isActive=false', async () => {
      const deactivated = { ...baseUser, isActive: false };
      mockToggleExecute.mockResolvedValueOnce({
        user: deactivated,
        reassignedIncidents: 2,
      });

      const res = await request(makeApp())
        .patch('/admin/users/user-id-1/status')
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isActive).toBe(false);
      expect(res.body.reassignedIncidents).toBe(2);
    });

    it('should return 200 and reactivated user on isActive=true', async () => {
      const activated = { ...baseUser, isActive: true };
      mockToggleExecute.mockResolvedValueOnce({
        user: activated,
        reassignedIncidents: 0,
      });

      const res = await request(makeApp())
        .patch('/admin/users/user-id-1/status')
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.user.isActive).toBe(true);
    });

    it('should return 400 when isActive field is missing', async () => {
      const res = await request(makeApp())
        .patch('/admin/users/user-id-1/status')
        .send({});

      expect(res.status).toBe(400);
      expect(mockToggleExecute).not.toHaveBeenCalled();
    });

    it('should return 403 when requester is not admin', async () => {
      const res = await request(makeApp('incident_manager'))
        .patch('/admin/users/user-id-1/status')
        .send({ isActive: false });

      expect(res.status).toBe(403);
      expect(mockToggleExecute).not.toHaveBeenCalled();
    });

    it('should return 404 when user does not exist', async () => {
      mockToggleExecute.mockRejectedValueOnce(
        new UserNotFoundError('user-id-ghost')
      );

      const res = await request(makeApp())
        .patch('/admin/users/user-id-ghost/status')
        .send({ isActive: false });

      expect(res.status).toBe(404);
    });

    it('should return 400 when admin tries to deactivate themselves', async () => {
      mockToggleExecute.mockRejectedValueOnce(
        new SelfModificationForbiddenError('deactivation')
      );

      const res = await request(makeApp('admin', 'admin-uid-1'))
        .patch('/admin/users/admin-uid-1/status')
        .send({ isActive: false });

      expect(res.status).toBe(400);
    });

    it('should return 500 without internal details when use case throws', async () => {
      mockToggleExecute.mockRejectedValueOnce(new Error('db timeout'));

      const res = await request(makeApp())
        .patch('/admin/users/user-id-1/status')
        .send({ isActive: false });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to toggle user status');
      expect(JSON.stringify(res.body)).not.toContain('db timeout');
    });
  });
});
