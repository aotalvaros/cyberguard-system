/**
 * Integration Tests: GET /api/statistics — Full Chain
 *
 * TIPO: Prueba de INTEGRACIÓN con Supertest.
 *
 * A diferencia de los unit tests (que mockean el use case o el middleware),
 * estos tests validan que TODAS las capas están correctamente cableadas juntas.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Cadena REAL bajo prueba:                                           │
 * │                                                                     │
 * │  HTTP Request                                                       │
 * │    → authMiddleware          ← REAL (jwt.verify() real)            │
 * │    → statisticsRouter        ← REAL (Express router real)          │
 * │    → ServiceFactory.getStatisticsUseCase() ← REAL (wiring real)   │
 * │    → GetThreatStatisticsUseCase.execute()  ← REAL (lógica real)   │
 * │    → PostgresThreatStatisticsRepository    ← REAL (mapeo SQL real)│
 * │    → getPool().query()       ← MOCK (única frontera mockeada)      │
 * │    → HTTP Response           ← REAL (serialización Express real)   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ¿Qué se MOCKEA?  Solo la frontera de infraestructura:
 *   - getPool()  → mock del pool de PostgreSQL (sin BD real)
 *   - config     → configuración fija de test (JWT_SECRET controlado)
 *   - logger     → silenciado en output de tests
 *   - Adapters no relacionados (Firebase, RabbitMQ, repos legacy)
 *
 * ¿Qué NO se mockea? (diferencia clave vs unit tests)
 *   - authMiddleware: jwt.verify() con jsonwebtoken es real
 *   - ServiceFactory.getStatisticsUseCase(): composición DI real
 *   - GetThreatStatisticsUseCase: lógica real, sin sustitución
 *   - PostgresThreatStatisticsRepository: mapeo SQL real (solo el pool es mock)
 *
 * VERIFICAR: Las capas están correctamente cableadas entre sí.
 * VALIDAR:   Invariantes de seguridad que SOLO se confirman en la cadena completa:
 *            - requests sin token → 401 (la autenticación no puede ser bypasseada
 *              por un bug de wiring entre router y middleware)
 *            - tokens con firma incorrecta → 401 (verificación criptográfica real)
 *            - errores de BD → 500 sin exponer detalles internos al cliente
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { type Express } from 'express';
import jwt from 'jsonwebtoken';

// ─── Secreto JWT fijo para los tests de integración ──────────────────────────
const TEST_JWT_SECRET = 'test-integration-secret-must-be-32ch!';

// ─── MOCKS: solo en la frontera de infraestructura ───────────────────────────
// Jest hoista estos jest.mock() antes de cualquier import estático.
// Regla: se mockea lo más cercano posible a la infraestructura real.

const mockQuery = jest.fn();

jest.mock('../../infrastructure/config/database', () => ({
  getPool: () => ({ query: mockQuery }),
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

// Adapters externos: no son objeto de prueba en esta feature.
// Su comportamiento ya está cubierto en sus propios unit tests.
jest.mock('../../infrastructure/providers/RabbitMQPublisher');
jest.mock('../../infrastructure/providers/FirebaseAuthProvider');
jest.mock('../../infrastructure/persistence/PostgresThreatRepository');
jest.mock('../../infrastructure/persistence/PostgresUserRepository');
jest.mock('../../infrastructure/persistence/PostgresAuditLogRepository');


// ─── Imports DESPUÉS de los mocks (order matters with jest.mock hoisting) ────
import { statisticsRouter } from '../../infrastructure/http/controllers/statistics.controller';
import { errorHandler } from '../../infrastructure/http/middlewares/error.middleware';
import { logger } from '../../infrastructure/config/logger';

// ─── Helpers de fixtures del pool ────────────────────────────────────────────
const makeCountResult = (n: number) => ({ rows: [{ count: String(n) }] });

const makeTypeGroupResult = (entries: Record<string, number>) => ({
  rows: Object.entries(entries).map(([type, count]) => ({
    type,
    count: String(count),
  })),
});

const makeSeverityGroupResult = (entries: Record<string, number>) => ({
  rows: Object.entries(entries).map(([severity, count]) => ({
    severity,
    count: String(count),
  })),
});

/** Genera un JWT firmado con el secreto de test (jsonwebtoken real). */
function signToken(
  payload: Record<string, unknown> = { id: 'admin-uid-1', username: 'admin', role: 'admin' },
  secret = TEST_JWT_SECRET
): string {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

/** Express app con todas las capas reales montadas (sin mocks de negocio). */
function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/statistics', statisticsRouter); // router + authMiddleware reales
  app.use(errorHandler);                        // error handler real
  return app;
}

// ─── Suite de Integración ─────────────────────────────────────────────────────
describe('Integration: GET /api/statistics — Full Chain', () => {
  let app: Express;

  beforeEach(() => {
    // La app se construye aquí para usar el mockQuery configurado en cada test.
    // mockQuery es limpiado por el setup.ts global (jest.clearAllMocks en beforeEach).
    app = buildApp();
    jest.spyOn(logger, 'error').mockRestore();
    jest.spyOn(logger, 'warn').mockRestore();
  });

  /**
   * VERIFICAR: Las capas están correctamente cableadas.
   *
   * Este test SOLO puede pasar si:
   *   1. El router dirige GET /api/statistics al handler correcto.
   *   2. authMiddleware extrae y verifica el JWT real con jwt.verify().
   *   3. El controller llama a ServiceFactory.getStatisticsUseCase().
   *   4. El use case llama a repository.getStatistics().
   *   5. El repositorio ejecuta Promise.all con 5 queries al pool.
   *   6. Los resultados del pool se mapean a ThreatStatistics.
   *   7. El controller serializa la respuesta con success: true.
   *
   * Un fallo de wiring en CUALQUIER capa rompe este test.
   */
  it('should return 200 with statistics when authenticated — validates full chain wiring', async () => {
    // Arrange: configurar el pool mock con respuestas realistas
    // Promise.all en PostgresThreatStatisticsRepository ejecuta 5 queries en paralelo:
    //   [0] total count, [1] byType GROUP BY, [2] bySeverity GROUP BY,
    //   [3] last 24h count, [4] critical active count
    mockQuery
      .mockResolvedValueOnce(makeCountResult(42) as never)
      .mockResolvedValueOnce(makeTypeGroupResult({ malware: 20, ddos: 22 }) as never)
      .mockResolvedValueOnce(
        makeSeverityGroupResult({ critical: 5, high: 15, medium: 12, low: 10 }) as never
      )
      .mockResolvedValueOnce(makeCountResult(8) as never)
      .mockResolvedValueOnce(makeCountResult(5) as never);

    // Act: token JWT real firmado con el secreto de test
    const res = await request(app)
      .get('/api/statistics')
      .set('Authorization', `Bearer ${signToken()}`);

    // Assert: respuesta completa y correctamente mapeada
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      totalThreats: 42,
      byType: { malware: 20, ddos: 22 },
      bySeverity: { critical: 5, high: 15, medium: 12, low: 10 },
      last24Hours: 8,
      criticalActive: 5,
    });
    // VERIFICAR: el repositorio ejecutó exactamente 5 queries (Promise.all real)
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });

  /**
   * VALIDAR (invariante de seguridad — equivalente al "saldo fantasma"):
   * El sistema NUNCA retorna estadísticas sin autenticación válida.
   *
   * Este test solo puede pasar si authMiddleware real intercepta la request
   * ANTES de que llegue al controller. Si existiera un bug de wiring que saltara
   * el middleware, el test devolvería 200 — detectando el fallo de seguridad.
   */
  it('should return 401 when no Authorization header — security invariant: stats never exposed without auth', async () => {
    // Act: request sin header de autorización
    const res = await request(app).get('/api/statistics');

    // Assert: el authMiddleware real bloquea con 401
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authorization header missing');
    // VALIDAR: ningún dato de estadísticas llega al cliente no autenticado
    expect(res.body.data).toBeUndefined();
    expect(res.body.success).toBeUndefined();
    // VALIDAR: el pool nunca fue consultado (auth bloqueó antes del use case)
    expect(mockQuery).not.toHaveBeenCalled();
  });

  /**
   * VALIDAR (invariante de seguridad — criptografía real):
   * Un token firmado con un secreto diferente SIEMPRE es rechazado.
   *
   * Este test confirma que jwt.verify() es real: no es un mock que siempre
   * retorna válido. Simula un atacante con un token fabricado.
   */
  it('should return 401 when token has wrong signature — real cryptographic JWT verification', async () => {
    // Arrange: token firmado con OTRO secreto (ataque de token fabricado)
    const attackerToken = signToken(
      { username: 'admin', role: 'admin' },
      'attacker-wrong-secret!!'    // secreto diferente al TEST_JWT_SECRET
    );

    // Act
    const res = await request(app)
      .get('/api/statistics')
      .set('Authorization', `Bearer ${attackerToken}`);

    // Assert: jwt.verify() real rechaza el token
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
    // VALIDAR: el pool nunca fue consultado (el atacante no llegó al use case)
    expect(mockQuery).not.toHaveBeenCalled();
  });

  /**
   * VALIDAR (fail-fast — propagación de errores a través de todas las capas):
   * Un error de base de datos se propaga desde el repositorio → use case →
   * controller → error handler, y llega al cliente como 500 SIN exponer
   * detalles internos (mensajes de error de PostgreSQL, rutas, etc.).
   *
   * Si alguna capa silenciara el error (catch sin rethrow), el test fallaría
   * retornando 200 con estadísticas vacías o incorrectas.
   */
  it('should return 500 without internal details when DB fails — error propagation across all layers', async () => {
    // Arrange: el pool falla (simula caída de PostgreSQL)
    const dbError = new Error('PostgreSQL: connection refused at host:5432');
    mockQuery.mockRejectedValue(dbError as never);

    // Act: request autenticada que llegará al repositorio
    const res = await request(app)
      .get('/api/statistics')
      .set('Authorization', `Bearer ${signToken()}`);

    // Assert
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Failed to retrieve statistics');
    // VALIDAR: detalles internos NUNCA llegan al cliente
    const responseBody = JSON.stringify(res.body);
    expect(responseBody).not.toContain('PostgreSQL');
    expect(responseBody).not.toContain('5432');
    expect(responseBody).not.toContain('connection refused');
  });

  /**
   * VERIFICAR: Sistema con cero amenazas retorna estadísticas vacías (no error).
   * Valida el wiring completo para el caso de BD vacía (primer despliegue).
   */
  it('should return 200 with zero statistics when DB is empty — empty state is valid', async () => {
    // Arrange: BD vacía (cero resultados en todas las queries)
    mockQuery
      .mockResolvedValueOnce(makeCountResult(0) as never)
      .mockResolvedValueOnce({ rows: [] } as never)       // byType: vacío
      .mockResolvedValueOnce({ rows: [] } as never)       // bySeverity: vacío
      .mockResolvedValueOnce(makeCountResult(0) as never)
      .mockResolvedValueOnce(makeCountResult(0) as never);

    // Act
    const res = await request(app)
      .get('/api/statistics')
      .set('Authorization', `Bearer ${signToken()}`);

    // Assert
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalThreats).toBe(0);
    expect(res.body.data.byType).toEqual({});       // objeto vacío, no null
    expect(res.body.data.bySeverity).toEqual({});   // objeto vacío, no null
    expect(res.body.data.last24Hours).toBe(0);
    expect(res.body.data.criticalActive).toBe(0);
  });
});
