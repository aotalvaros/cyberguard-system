/**
 * TDD — Unit Tests: PostgresThreatStatisticsRepository
 *
 * Deuda TDD corregida: la implementación existía sin tests.
 * Estos tests se agregan AHORA como parte del ciclo de calidad.
 *
 * VERIFICAR: El adaptador convierte correctamente las rows de pg → ThreatStatistics.
 * VALIDAR:   El adaptador propaga errores del pool (fail-fast, sin datos silenciosamente incorrectos).
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mock del módulo database ANTES de importar el adaptador ─────────────────
const mockQuery = jest.fn();
const mockPool = { query: mockQuery };

jest.mock('../../../../infrastructure/config/database', () => ({
  getPool: () => mockPool,
}));

import { PostgresThreatStatisticsRepository } from '../../../../infrastructure/persistence/PostgresThreatStatisticsRepository';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const makeCountResult = (n: number) => ({ rows: [{ count: String(n) }] });
const makeTypeGroupResult = (entries: Record<string, number>) => ({
  rows: Object.entries(entries).map(([type, count]) => ({ type, count: String(count) })),
});
const makeSeverityGroupResult = (entries: Record<string, number>) => ({
  rows: Object.entries(entries).map(([severity, count]) => ({ severity, count: String(count) })),
});

describe('PostgresThreatStatisticsRepository', () => {
  let repository: PostgresThreatStatisticsRepository;

  beforeEach(() => {
    repository = new PostgresThreatStatisticsRepository();
    jest.clearAllMocks();
  });

  describe('getStatistics()', () => {
    /**
     * VERIFICAR: Caso base — BD con datos retorna el modelo de dominio correcto.
     */
    it('should return correct statistics when database has threats', async () => {
      // Arrange — Promise.all llama en orden: total, byType, bySeverity, last24h, critical
      mockQuery
        .mockResolvedValueOnce(makeCountResult(42) as never)
        .mockResolvedValueOnce(makeTypeGroupResult({ malware: 20, ddos: 22 }) as never)
        .mockResolvedValueOnce(makeSeverityGroupResult({ critical: 5, high: 15, medium: 12, low: 10 }) as never)
        .mockResolvedValueOnce(makeCountResult(8) as never)
        .mockResolvedValueOnce(makeCountResult(5) as never);

      // Act
      const result = await repository.getStatistics();

      // Assert
      expect(result.totalThreats).toBe(42);
      expect(result.byType).toEqual({ malware: 20, ddos: 22 });
      expect(result.bySeverity).toEqual({ critical: 5, high: 15, medium: 12, low: 10 });
      expect(result.last24Hours).toBe(8);
      expect(result.criticalActive).toBe(5);
    });

    /**
     * VALIDAR: BD vacía → ceros en todos los campos (estado válido, no error).
     * Verifica que el fallback ?? '0' funciona cuando rows está vacío.
     */
    it('should return zero statistics when the database is empty', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as never)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] } as never);

      // Act
      const result = await repository.getStatistics();

      // Assert
      expect(result.totalThreats).toBe(0);
      expect(result.byType).toEqual({});
      expect(result.bySeverity).toEqual({});
      expect(result.last24Hours).toBe(0);
      expect(result.criticalActive).toBe(0);
    });

    /**
     * VALIDAR: Si rows[0] es undefined (pool retorna filas vacías en COUNT queries),
     * el ?? '0' previene NaN — integridad del modelo garantizada.
     */
    it('should default count to 0 and never return NaN when count row is missing', async () => {
      // Arrange — rows[] vacío en queries de COUNT
      mockQuery
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      // Act
      const result = await repository.getStatistics();

      // Assert — nunca NaN, siempre un número válido
      expect(Number.isNaN(result.totalThreats)).toBe(false);
      expect(Number.isNaN(result.last24Hours)).toBe(false);
      expect(Number.isNaN(result.criticalActive)).toBe(false);
      expect(result.totalThreats).toBe(0);
    });

    /**
     * VERIFICAR: Se ejecutan exactamente 5 queries en paralelo (Promise.all).
     * Un cambio que redujera o aumentara este número rompería este test.
     */
    it('should execute exactly 5 SQL queries per call', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce(makeCountResult(1) as never)
        .mockResolvedValueOnce(makeTypeGroupResult({}) as never)
        .mockResolvedValueOnce(makeSeverityGroupResult({}) as never)
        .mockResolvedValueOnce(makeCountResult(0) as never)
        .mockResolvedValueOnce(makeCountResult(0) as never);

      // Act
      await repository.getStatistics();

      // Assert
      expect(mockQuery).toHaveBeenCalledTimes(5);
    });

    /**
     * VERIFICAR: Las queries SQL contienen las cláusulas correctas.
     * Protege contra regresiones donde un developer cambie la query sin querer.
     */
    it('should use correct SQL clauses for each query', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce(makeCountResult(0) as never)
        .mockResolvedValueOnce(makeTypeGroupResult({}) as never)
        .mockResolvedValueOnce(makeSeverityGroupResult({}) as never)
        .mockResolvedValueOnce(makeCountResult(0) as never)
        .mockResolvedValueOnce(makeCountResult(0) as never);

      // Act
      await repository.getStatistics();

      // Assert — inspeccionar SQL de cada call
      const sqls = mockQuery.mock.calls.map((c) =>
        (c[0] as string).replace(/\s+/g, ' ').trim().toLowerCase()
      );

      expect(sqls[0]).toMatch(/count\(\*\)/);
      expect(sqls[0]).not.toMatch(/group by/);         // total: sin agrupación

      expect(sqls[1]).toMatch(/group by type/);        // byType
      expect(sqls[2]).toMatch(/group by severity/);    // bySeverity

      expect(sqls[3]).toMatch(/24 hours/);             // last24h
      expect(sqls[4]).toMatch(/severity = 'critical'/); // criticalActive
    });

    /**
     * VALIDAR: Si pool.query lanza una excepción, el error se propaga sin silencio.
     * Garantiza fail-fast — el controller puede responder 500 correctamente.
     */
    it('should propagate pool errors without catching them', async () => {
      // Arrange
      const poolError = new Error('ECONNREFUSED: PostgreSQL not reachable');
      mockQuery.mockRejectedValueOnce(poolError as never);

      // Act & Assert
      await expect(repository.getStatistics()).rejects.toThrow(
        'ECONNREFUSED: PostgreSQL not reachable'
      );
    });

    /**
     * VERIFICAR: Los valores de count son `number`, no `string`.
     * PostgreSQL retorna COUNT como string — parseInt debe aplicarse siempre.
     */
    it('should return number types, not strings, for all numeric fields', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce(makeCountResult(7) as never)
        .mockResolvedValueOnce(makeTypeGroupResult({ intrusion: 3 }) as never)
        .mockResolvedValueOnce(makeSeverityGroupResult({ medium: 4 }) as never)
        .mockResolvedValueOnce(makeCountResult(1) as never)
        .mockResolvedValueOnce(makeCountResult(0) as never);

      // Act
      const result = await repository.getStatistics();

      // Assert
      expect(typeof result.totalThreats).toBe('number');
      expect(typeof result.last24Hours).toBe('number');
      expect(typeof result.criticalActive).toBe('number');
      expect(typeof result.byType['intrusion']).toBe('number');
      expect(typeof result.bySeverity['medium']).toBe('number');
    });

    /**
     * VERIFICAR: byType usa la columna `type` y bySeverity usa `severity`
     * para construir los Records. Protege contra confusión de columnas.
     */
    it('should correctly map type and severity column names to record keys', async () => {
      // Arrange
      mockQuery
        .mockResolvedValueOnce(makeCountResult(5) as never)
        .mockResolvedValueOnce(makeTypeGroupResult({ malware: 5, phishing: 3 }) as never)
        .mockResolvedValueOnce(makeSeverityGroupResult({ high: 4, low: 2 }) as never)
        .mockResolvedValueOnce(makeCountResult(2) as never)
        .mockResolvedValueOnce(makeCountResult(0) as never);

      // Act
      const result = await repository.getStatistics();

      // Assert — claves correctas en cada Record
      expect(Object.keys(result.byType)).toContain('malware');
      expect(Object.keys(result.byType)).toContain('phishing');
      expect(Object.keys(result.bySeverity)).toContain('high');
      expect(Object.keys(result.bySeverity)).toContain('low');
    });
  });
});
