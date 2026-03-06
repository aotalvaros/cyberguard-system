/**
 * Integration Tests: POST /api/auth/login — Full Chain
 *
 * TIPO: Prueba de INTEGRACIÓN con Supertest.
 *
 * Complementa statistics.integration.test.ts con un segundo patrón de
 * integración: el flujo de GENERACIÓN de JWT (vs verificación en statistics).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Cadena REAL bajo prueba:                                                │
 * │                                                                          │
 * │  HTTP Request                                                            │
 * │    → bruteForceDetection     ← REAL (Map en memoria, sin BD)            │
 * │    → Joi schema validation   ← REAL (400 antes de llegar al servicio)   │
 * │    → AuthService.login()     ← REAL (orquestación de puertos real)      │
 * │    → JWTTokenService.generateToken() ← REAL (jwt.sign() real)           │
 * │    → HTTP Response           ← REAL (serialización Express real)        │
 * │    → FirebaseAuthProvider    ← MOCK (servicio externo, frontera)        │
 * │    → query() / getPool()     ← MOCK (PostgreSQL, sin BD real)           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ¿Qué se MOCKEA?  Las dos fronteras de infraestructura externa:
 *   - FirebaseAuthProvider.authenticate() → resultado controlado por test
 *   - query() / getPool()  → pool de PostgreSQL (user lookup, audit log)
 *   - config     → JWT_SECRET controlado para poder verificar el token
 *   - logger     → silenciado en output de tests
 *   - RabbitMQPublisher → no relevante para auth
 *
 * ¿Qué NO se mockea? (capas de negocio que deben ser REALES)
 *   - bruteForceDetection: usa un Map en memoria, 0 dependencias externas
 *   - Joi validation: 100% en memoria, 0 dependencias externas
 *   - AuthService: toda la lógica de orquestación (lookup, auto-create, audit)
 *   - JWTTokenService: jwt.sign() real con la clave de test controlada
 *   - Serialización de la respuesta HTTP
 *
 * VERIFICAR: authController + AuthService + JWTTokenService están cableados.
 * VALIDAR:   Invariantes de negocio que SOLO se confirman en la cadena completa:
 *            - credenciales inválidas → 401, NUNCA un JWT (Firebase decide)
 *            - input malformado → 400 ANTES de llamar a Firebase (Joi real)
 *            - login satisfactorio → token JWT verificable criptográficamente
 *            - usuario sin registro en Postgres → se auto-crea (lógica AuthService)
 */
import { describe, it, expect, jest, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';

// ─── Secreto JWT fijo para los tests de integración ──────────────────────────
const TEST_JWT_SECRET = 'test-integration-secret-must-be-32ch!';

// ─── MOCKS: solo en las fronteras de infraestructura ─────────────────────────
// Jest hoista estos jest.mock() antes de cualquier import estático.

// 1. Frontera de BD: query() directo (UserRepository, AuditLogRepository)
//    Y getPool() para repositorios que toman el pool directamente.
// Tipo auxiliar: función asíncrona genérica.
// Necesario porque jest.fn() sin tipo devuelve Mock<UnknownFunction> donde
// ResolveType<UnknownFunction> = never (ReturnType<unknown> no extiende PromiseLike).
// Con AsyncFn, ResolveType<AsyncFn> = unknown → mockResolvedValue acepta cualquier valor.
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

// 2. Frontera de autenticación externa: Firebase → mock controlable por test
const mockAuthenticate = jest.fn<AsyncFn>();

jest.mock('../../infrastructure/providers/FirebaseAuthProvider', () => ({
  FirebaseAuthProvider: jest.fn().mockImplementation(() => ({
    authenticate: mockAuthenticate,
  })),
}));

// Adapters externos no relacionados con el flujo de auth
jest.mock('../../infrastructure/providers/RabbitMQPublisher');
jest.mock('../../infrastructure/persistence/PostgresThreatRepository');

// ─── Imports DESPUÉS de los mocks (jest.mock() se hoista al tope) ─────────────
import authRouter from '../../infrastructure/http/controllers/auth.controller';
import { resetBruteForceState, stopBruteForceCleanup } from '../../infrastructure/http/middlewares/bruteforce.middleware';

// ─── Fixtures: fila de usuario existente en PostgreSQL ───────────────────────
const existingUserRow = {
  id: 'user-uuid-123',
  username: 'admin',
  email: 'admin@cyberguard.com',
  role: 'admin',
  is_locked: false,
  failed_attempts: 0,
  last_login: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── Builder de la app de test ────────────────────────────────────────────────
function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Integration: POST /api/auth/login — Full Chain', () => {
  let app: Express;

  beforeEach(() => {
    app = buildApp();
    resetBruteForceState(); // Limpiar estado del Map en memoria entre tests
  });

  afterAll(() => {
    stopBruteForceCleanup();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // VERIFICAR: El cableado entre capas funciona (las piezas están conectadas)
  // ──────────────────────────────────────────────────────────────────────────

  it('should return 200 with a valid JWT when credentials are correct — validates full chain wiring', async () => {
    // Arrange: Firebase autentica con éxito
    mockAuthenticate.mockResolvedValue({
      success: true,
      user: { id: 'firebase-uid-abc', username: 'admin', role: 'admin' },
      token: 'firebase-id-token',
    });

    // Arrange: PostgreSQL devuelve el usuario (findByUsername → 1 fila)
    //   + UPDATE last_login no retorna filas (void semántico)
    mockQuery
      .mockResolvedValueOnce([existingUserRow]) // findByUsername('admin') → rows[0]
      .mockResolvedValue([]); // cualquier UPDATE posterior → vacío

    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'SecurePass123' });

    // Assert: HTTP 200 + token + user en body
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe('admin');
    expect(response.body.user.role).toBe('admin');
  });

  it('should return a cryptographically valid JWT signed with the configured secret', async () => {
    // Arrange
    mockAuthenticate.mockResolvedValue({
      success: true,
      user: { id: 'firebase-uid-abc', username: 'admin', role: 'admin' },
      token: 'firebase-id-token',
    });
    mockQuery.mockResolvedValueOnce([existingUserRow]).mockResolvedValue([]);

    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'SecurePass123' });

    // Assert: El token debe poder verificarse con jwt.verify() real
    // Esto SOLO pasa si JWTTokenService.generateToken() usó TEST_JWT_SECRET,
    // lo que confirma que config.jwtSecret fue inyectado correctamente.
    const token = response.body.token as string;
    expect(() => jwt.verify(token, TEST_JWT_SECRET)).not.toThrow();

    const decoded = jwt.verify(token, TEST_JWT_SECRET) as jwt.JwtPayload;
    expect(decoded['username']).toBe('admin');
    expect(decoded['role']).toBe('admin');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // VALIDAR: Invariantes de negocio que deben cumplirse pase lo que pase
  // ──────────────────────────────────────────────────────────────────────────

  it('should return 401 when Firebase rejects credentials — security invariant: no JWT on failure', async () => {
    // Arrange: Firebase rechaza las credenciales
    mockAuthenticate.mockResolvedValue({
      success: false,
      error: 'Invalid credentials',
    });
    // El audit log de login_failed es fire-and-forget → mockQuery puede resolver vacío
    mockQuery.mockResolvedValue([]);

    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' });

    // Assert: 401 y NUNCA un token en la respuesta
    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('token');
  });

  it('should return 400 when request body is missing required fields — Joi validation runs before Firebase', async () => {
    // Arrange: body intencionalmente inválido (sin password)
    // No configuramos mockAuthenticate → si lo llamara, fallaría con "not a function"

    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' }); // password ausente

    // Assert: 400 — validación Joi detiene el request antes de llegar a Firebase
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    // Verificar que Firebase NO fue llamado (la validación es la primera barrera)
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('should return 400 when username is too short — Joi min(3) validation', async () => {
    // Arrange: username de 2 caracteres (mínimo es 3)
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ab', password: 'SecurePass123' });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(mockAuthenticate).not.toHaveBeenCalled();
  });

  it('should auto-create user in PostgreSQL when Firebase authenticates but user is not in DB', async () => {
    // Arrange: Firebase autentica con éxito
    mockAuthenticate.mockResolvedValue({
      success: true,
      user: { id: 'firebase-uid-new', username: 'newuser', role: 'viewer' },
      token: 'firebase-id-token',
    });

    // Fila que el INSERT ... RETURNING * debe devolver (save() lo valida con !row).
    // Si el mock retorna [] el repositorio lanza "Failed to save user: no row returned"
    // que sería capturado por el catch de AuthService → 401. El mock debe simular
    // el RETURNING correctamente.
    const autoCreatedUserRow = {
      id: 'user-uuid-new-001',
      username: 'newuser',
      email: 'newuser',
      role: 'viewer',
      is_locked: false,
      failed_attempts: 0,
      last_login: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Arrange: PostgreSQL no encuentra el usuario en dos intentos de lookup.
    // AuthService busca por localUsername y luego por rawUsername antes de auto-crear.
    // Luego: INSERT RETURNING * devuelve la fila creada; UPDATEs y audit logs → [].
    mockQuery
      .mockResolvedValueOnce([])                   // findByUsername('newuser') → no existe
      .mockResolvedValueOnce([])                   // findByUsername('newuser') segundo intento
      .mockResolvedValueOnce([autoCreatedUserRow]) // save() INSERT RETURNING * → fila creada
      .mockResolvedValue([]);                      // resetFailedAttempts, updateLastLogin, audit logs

    // Act
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'newuser', password: 'SecurePass123' });

    // Assert: AuthService ejecutó la rama de auto-creación y devolvió un JWT válido.
    // Este escenario SOLO es alcanzable si AuthService.login() completa la ruta
    // de auto-creación — valida que la lógica de negocio está cableada correctamente.
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.username).toBe('newuser');
  });
});
