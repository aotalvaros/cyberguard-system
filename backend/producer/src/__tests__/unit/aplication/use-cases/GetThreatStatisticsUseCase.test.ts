/**
 * TDD — RED Phase
 * These tests were written BEFORE the GetThreatStatisticsUseCase implementation exists.
 * Running `npm test` at this stage will FAIL (module not found).
 *
 * Verification: Verificar que el use case delega correctamente al port (arquitectura).
 * Validation:   Validar que las reglas de negocio se protegen:
 *               - el repositorio se llama exactamente una vez (SRP)
 *               - los errores de infraestructura se propagan sin silencio (fail-fast)
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetThreatStatisticsUseCase } from '../../../../application/use-cases/GetThreatStatisticsUseCase';
import type {
  ThreatStatisticsRepository,
  ThreatStatistics,
} from '../../../../domain/ports/ThreatStatisticsRepository';

// ── Typed mock implementing the domain port (no real DB) ──────────────────────
class MockThreatStatisticsRepository implements ThreatStatisticsRepository {
  getStatistics = jest.fn<() => Promise<ThreatStatistics>>();
}

describe('GetThreatStatisticsUseCase', () => {
  let useCase: GetThreatStatisticsUseCase;
  let mockRepo: MockThreatStatisticsRepository;

  const mockStats: ThreatStatistics = {
    totalThreats: 42,
    byType: { malware: 20, ddos: 22 },
    bySeverity: { critical: 5, high: 15, medium: 12, low: 10 },
    last24Hours: 8,
    criticalActive: 5,
  };

  beforeEach(() => {
    mockRepo = new MockThreatStatisticsRepository();
    useCase = new GetThreatStatisticsUseCase(mockRepo);
    jest.clearAllMocks();
  });

  /**
   * VERIFICAR: El use case retorna exactamente lo que el repositorio (port) devuelve.
   * No debe transformar, filtrar ni enriquecer la respuesta.
   */
  it('should return statistics from the repository unchanged', async () => {
    // Arrange
    mockRepo.getStatistics.mockResolvedValue(mockStats);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result).toEqual(mockStats);
  });

  /**
   * VERIFICAR: El use case llama al port exactamente una vez por ejecución.
   * Garantiza que no hay lógica de caché ni llamadas redundantes.
   */
  it('should call the repository exactly once per execute() call', async () => {
    // Arrange
    mockRepo.getStatistics.mockResolvedValue(mockStats);

    // Act
    await useCase.execute();

    // Assert
    expect(mockRepo.getStatistics).toHaveBeenCalledTimes(1);
  });

  /**
   * VALIDAR (regla de negocio / resiliencia): Si la infraestructura falla,
   * el use case NO silencia el error. El error debe propagarse para que las
   * capas superiores (controller) puedan decidir cómo responder.
   * Esto protege al sistema de estadísticas silenciosamente incorrectas.
   */
  it('should propagate repository errors without catching them', async () => {
    // Arrange
    const dbError = new Error('PostgreSQL connection refused');
    mockRepo.getStatistics.mockRejectedValue(dbError);

    // Act & Assert
    await expect(useCase.execute()).rejects.toThrow('PostgreSQL connection refused');
    expect(mockRepo.getStatistics).toHaveBeenCalledTimes(1);
  });

  /**
   * VALIDAR: Un conjunto de estadísticas vacías (DB vacía) es un estado válido,
   * no un error. El use case debe retornarlo sin lanzar excepciones.
   */
  it('should return empty statistics when repository returns zeros', async () => {
    // Arrange
    const emptyStats: ThreatStatistics = {
      totalThreats: 0,
      byType: {},
      bySeverity: {},
      last24Hours: 0,
      criticalActive: 0,
    };
    mockRepo.getStatistics.mockResolvedValue(emptyStats);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result.totalThreats).toBe(0);
    expect(result.byType).toEqual({});
    expect(result.bySeverity).toEqual({});
    expect(result.last24Hours).toBe(0);
    expect(result.criticalActive).toBe(0);
  });

  /**
   * VERIFICAR: El use case funciona correctamente con estadísticas de múltiples
   * tipos y severidades. Verifica que no hay transformación parcial del objeto.
   */
  it('should handle statistics with multiple types and severities', async () => {
    // Arrange
    const richStats: ThreatStatistics = {
      totalThreats: 100,
      byType: { malware: 30, ddos: 25, phishing: 20, intrusion: 15, ransomware: 10 },
      bySeverity: { critical: 20, high: 30, medium: 35, low: 15 },
      last24Hours: 12,
      criticalActive: 20,
    };
    mockRepo.getStatistics.mockResolvedValue(richStats);

    // Act
    const result = await useCase.execute();

    // Assert
    expect(result).toEqual(richStats);
    expect(Object.keys(result.byType)).toHaveLength(5);
    expect(Object.keys(result.bySeverity)).toHaveLength(4);
  });
});
