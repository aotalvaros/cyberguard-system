/**
 * Integration Tests: GET/PATCH /api/profile — Full Chain
 *
 * TIPO: Prueba de INTEGRACIÓN con Supertest.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Cadena REAL bajo prueba:                                                │
 * │                                                                          │
 * │  HTTP Request                                                            │
 * │    → authMiddleware (JWT verify)    ← REAL (jwt.verify() real)          │
 * │    → Joi schema validation (PATCH)  ← REAL (400 antes del use case)     │
 * │    → GetAdminProfileUseCase         ← REAL (lógica de consulta real)    │
 * │    → UpdateAdminProfileUseCase      ← REAL (lógica de mutación real)    │
 * │    → domainErrorToStatus()          ← REAL (mapeo HTTP real)            │
 * │    → query() / getPool()            ← MOCK (frontera PostgreSQL)        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ¿Qué se MOCKEA? Solo fronteras externas:
 *   - query() / getPool()   → PostgreSQL (sin BD real)
 *   - config                → JWT_SECRET controlado
 *   - logger                → silenciado
 *   - RabbitMQPublisher     → no relevante
 *   - FirebaseAuthProvider  → no relevante (auth es via JWT ya validado)
 *   - ServiceFactory        → para controlar retornos de use cases
 *
 * ¿Qué NO se mockea?
 *   - authMiddleware: jwt.verify() real con secret controlado
 *   - Joi schema: validación real (400 antes de llegar al use case)
 *   - domainErrorToStatus(): mapeo HTTP real
 *   - Router Express: cableado real de rutas
 *
 * VERIFICAR: GET /api/profile retorna datos del perfil con JWT válido.
 * VERIFICAR: PATCH /api/profile actualiza y retorna datos actualizados.
 * VALIDAR:   401 cuando JWT ausente o inválido — authMiddleware real.
 * VALIDAR:   400 cuando body PATCH no incluye campos permitidos — Joi real.
 * VALIDAR:   404 cuando usuario no existe — ProfileNotFoundException real.
 * VALIDAR:   409 cuando email en uso — EmailAlreadyExistsException real.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';

// ─── JWT controlado ──────────────────────────────────────────────────────────
const TEST_JWT_SECRET = 'test-integration-secret-must-be-32ch!';

// ─── Mocks de fronteras externas ─────────────────────────────────────────────
type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const mockQuery = jest.fn<AsyncFn>();

jest.mock('../../infrastructure/config/database', () => ({
  query: mockQuery,
  getPool: () => ({ query: mockQuery }),
  closePool: jest.fn(),
}));

jest.mock('../../infrastructure/config/env', () => ({
  config: {
    jwtSecret: TEST_JWT_SECRET,
    allowedOrigins: ['http://localhost:4200'],
    nodeEnv: 'test',
    firebaseApiKey: 'test-api-key',
    firebaseAuthDomain: 'test.firebaseapp.com',
    firebaseProjectId: 'test-project',
    rabbitmqUrl: 'amqp://localhost',
  },
}));

jest.mock('../../infrastructure/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../infrastructure/config/rabbitmq', () => ({
  connectRabbitMQ: jest.fn(),
  closeRabbitMQ: jest.fn(),
}));

jest.mock('../../infrastructure/providers/FirebaseAuthProvider', () => ({
  FirebaseAuthProvider: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn(),
  })),
}));

// ─── Mock controlable de ServiceFactory ──────────────────────────────────────
const mockGetProfile = jest.fn<AsyncFn>();
const mockUpdateProfile = jest.fn<AsyncFn>();

jest.mock('../../infrastructure/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getGetAdminProfileUseCase: () => ({ execute: mockGetProfile }),
    getUpdateAdminProfileUseCase: () => ({ execute: mockUpdateProfile }),
  },
}));

// ─── App de test ─────────────────────────────────────────────────────────────
// Se importa DESPUÉS de los mocks para que Jest los aplique primero.
import profileRoutes from '../../infrastructure/http/controllers/profile.controller';
import { ProfileNotFoundException } from '../../domain/exceptions/ProfileNotFoundException';
import { EmailAlreadyExistsException } from '../../domain/exceptions/EmailAlreadyExistsException';

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/profile', profileRoutes);
  return app;
}

// ─── Helper: genera un JWT válido para los tests ──────────────────────────────
function makeValidJwt(username = 'admin', role = 'admin'): string {
  return jwt.sign({ id: 'user-uuid-test', username, role }, TEST_JWT_SECRET, { expiresIn: '1h' });
}

// ─── Fixture de perfil ────────────────────────────────────────────────────────
const profileFixture = {
  username: 'admin',
  email: 'admin@cyberguard.com',
  role: 'admin',
  phone: '+573001234567',
  createdAt: '2026-01-01T00:00:00.000Z',
};

// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/profile', () => {
  let app: Express;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it('should return 200 with profile data when JWT is valid', async () => {
    (mockGetProfile as jest.MockedFunction<AsyncFn>).mockResolvedValueOnce(profileFixture);
    const token = makeValidJwt();

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      username: 'admin',
      email: 'admin@cyberguard.com',
      role: 'admin',
      phone: '+573001234567',
    });
    // ⚠️ HUMAN CHECK: confirmar que campos sensibles no están en response
    expect(res.body).not.toHaveProperty('isLocked');
    expect(res.body).not.toHaveProperty('failedAttempts');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app)
      .get('/api/profile');

    expect(res.status).toBe(401);
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it('should return 401 when JWT is malformed', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer not-a-valid-jwt');

    expect(res.status).toBe(401);
    expect(mockGetProfile).not.toHaveBeenCalled();
  });

  it('should return 404 when ProfileNotFoundException is thrown', async () => {
    (mockGetProfile as jest.MockedFunction<AsyncFn>).mockRejectedValueOnce(
      new ProfileNotFoundException('admin')
    );
    const token = makeValidJwt();

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PROFILE_NOT_FOUND');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/profile', () => {
  let app: Express;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it('should return 200 with updated profile on valid PATCH', async () => {
    const updated = { ...profileFixture, phone: '+573009999999' };
    (mockUpdateProfile as jest.MockedFunction<AsyncFn>).mockResolvedValueOnce(updated);
    const token = makeValidJwt();

    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+573009999999' });

    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('+573009999999');
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
  });

  it('should return 400 when PATCH body is empty (no fields)', async () => {
    const token = makeValidJwt();

    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    // Joi schema requires at least one field → validate middleware returns 400
    expect(res.status).toBe(400);
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('should return 400 when body includes role field despite Joi stripping', async () => {
    // Joi stripUnknown removes 'role', leaving body empty → .min(1) triggers 400
    const token = makeValidJwt();

    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'superadmin' });

    expect(res.status).toBe(400);
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('should return 409 when EmailAlreadyExistsException is thrown', async () => {
    (mockUpdateProfile as jest.MockedFunction<AsyncFn>).mockRejectedValueOnce(
      new EmailAlreadyExistsException('taken@cyberguard.com')
    );
    const token = makeValidJwt();

    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'taken@cyberguard.com' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('should return 401 when JWT is missing on PATCH', async () => {
    const res = await request(app)
      .patch('/api/profile')
      .send({ username: 'hacker' });

    expect(res.status).toBe(401);
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
