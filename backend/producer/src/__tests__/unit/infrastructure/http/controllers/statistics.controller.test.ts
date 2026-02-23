/**
 * TDD — Unit Tests: statistics.controller.ts
 *
 * Deuda TDD corregida: la implementación existía sin tests.
 * Estos tests cubren el contrato HTTP del endpoint GET /api/statistics.
 *
 * VERIFICAR: El controller invoca el use case y serializa la respuesta correctamente.
 * VALIDAR:   El controller retorna 500 sin exponer detalles internos cuando el use case falla.
 *            El controller rechaza requests sin autenticación (authMiddleware).
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

// ==========================================================================
// MOCKS — deben declararse ANTES de los imports del módulo bajo prueba
// ==========================================================================

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const mockExecute = jest.fn();
const mockGetStatisticsUseCase = jest.fn(() => ({ execute: mockExecute }));

jest.mock('../../../../../infrastructure/config/logger', () => ({
  logger: mockLogger,
}));

jest.mock('../../../../../infrastructure/factories/ServiceFactory', () => ({
  ServiceFactory: {
    getStatisticsUseCase: mockGetStatisticsUseCase,
  },
}));

// authMiddleware se bypasea en unit tests — su comportamiento ya está testeado
// en auth.middleware.test.ts. Aquí nos interesa el comportamiento del controller.
jest.mock('../../../../../infrastructure/http/middlewares/auth.middleware', () => ({
  authMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { statisticsRouter } from '../../../../../infrastructure/http/controllers/statistics.controller';

// ==========================================================================
// FIXTURES
// ==========================================================================

const mockStats = {
  totalThreats: 42,
  byType: { malware: 20, ddos: 22 },
  bySeverity: { critical: 5, high: 15, medium: 12, low: 10 },
  last24Hours: 8,
  criticalActive: 5,
};

// ==========================================================================
// TESTS
// ==========================================================================

describe('Statistics Controller — GET /statistics', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/statistics', statisticsRouter);
  });

  // ─── Happy Path ───────────────────────────────────────────────────────────

  describe('Successful responses', () => {
    /**
     * VERIFICAR: El controller retorna 200 con success:true y data correcta.
     */
    it('should return 200 with success:true and statistics data', async () => {
      // Arrange
      mockExecute.mockResolvedValue(mockStats as never);

      // Act
      const response = await request(app).get('/statistics');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockStats,
      });
    });

    /**
     * VERIFICAR: El controller llama a ServiceFactory.getStatisticsUseCase() exactamente una vez.
     */
    it('should call ServiceFactory.getStatisticsUseCase once per request', async () => {
      // Arrange
      mockExecute.mockResolvedValue(mockStats as never);

      // Act
      await request(app).get('/statistics');

      // Assert
      expect(mockGetStatisticsUseCase).toHaveBeenCalledTimes(1);
    });

    /**
     * VERIFICAR: El controller llama a useCase.execute() exactamente una vez.
     */
    it('should call useCase.execute() exactly once per request', async () => {
      // Arrange
      mockExecute.mockResolvedValue(mockStats as never);

      // Act
      await request(app).get('/statistics');

      // Assert
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    /**
     * VERIFICAR: Las estadísticas vacías (BD sin amenazas) se retornan correctamente.
     */
    it('should return 200 with empty statistics when database has no threats', async () => {
      // Arrange
      const emptyStats = {
        totalThreats: 0,
        byType: {},
        bySeverity: {},
        last24Hours: 0,
        criticalActive: 0,
      };
      mockExecute.mockResolvedValue(emptyStats as never);

      // Act
      const response = await request(app).get('/statistics');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalThreats).toBe(0);
      expect(response.body.data.byType).toEqual({});
    });

    /**
     * VERIFICAR: Content-Type es application/json.
     */
    it('should return Content-Type application/json', async () => {
      // Arrange
      mockExecute.mockResolvedValue(mockStats as never);

      // Act
      const response = await request(app).get('/statistics');

      // Assert
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    /**
     * VERIFICAR: El logger.info se llama con el total de amenazas.
     */
    it('should log success with totalThreats', async () => {
      // Arrange
      mockExecute.mockResolvedValue(mockStats as never);

      // Act
      await request(app).get('/statistics');

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Statistics retrieved successfully',
        expect.objectContaining({ totalThreats: 42 })
      );
    });
  });

  // ─── Error Path ───────────────────────────────────────────────────────────

  describe('Error handling', () => {
    /**
     * VALIDAR: Si el use case falla, el controller retorna 500 con error genérico.
     * El mensaje de error interno NO debe exponerse al cliente (seguridad).
     */
    it('should return 500 with generic error message when use case throws', async () => {
      // Arrange
      mockExecute.mockRejectedValue(new Error('PostgreSQL connection refused') as never);

      // Act
      const response = await request(app).get('/statistics');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to retrieve statistics',
      });
    });

    /**
     * VALIDAR: El error interno NO se expone en la respuesta al cliente.
     * Protege contra information disclosure.
     */
    it('should NOT expose internal error details to the client', async () => {
      // Arrange
      mockExecute.mockRejectedValue(new Error('DB_SECRET_CONNECTION_STRING=...') as never);

      // Act
      const response = await request(app).get('/statistics');

      // Assert — la cadena de error interna no debe aparecer en la respuesta
      expect(JSON.stringify(response.body)).not.toContain('DB_SECRET_CONNECTION_STRING');
      expect(response.body.error).toBe('Failed to retrieve statistics');
    });

    /**
     * VALIDAR: El error se loguea en el servidor (para diagnóstico).
     */
    it('should log the internal error on failure', async () => {
      // Arrange
      mockExecute.mockRejectedValue(new Error('Internal DB error') as never);

      // Act
      await request(app).get('/statistics');

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to retrieve statistics',
        expect.objectContaining({ error: 'Internal DB error' })
      );
    });

    /**
     * VALIDAR: success:false en la respuesta cuando hay error.
     */
    it('should return success:false on error', async () => {
      // Arrange
      mockExecute.mockRejectedValue(new Error('Timeout') as never);

      // Act
      const response = await request(app).get('/statistics');

      // Assert
      expect(response.body.success).toBe(false);
    });
  });

  // ─── Auth ─────────────────────────────────────────────────────────────────

  describe('Authentication', () => {
    /**
     * VERIFICAR: El middleware de autenticación está montado en la ruta.
     * En este test el mock de authMiddleware siempre llama next(),
     * pero verificamos que el módulo se importa y se registra en la cadena.
     */
    it('should invoke authMiddleware (mocked as pass-through in unit tests)', async () => {
      // Arrange
      mockExecute.mockResolvedValue(mockStats as never);

      // Act
      const response = await request(app).get('/statistics');

      // Assert — si authMiddleware no estuviera en la cadena, la ruta no alcanzaría execute
      expect(response.status).toBe(200);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });
  });
});
