// Tipo de prueba: Unitario
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError, firstValueFrom } from 'rxjs';
import { GetStatisticsUseCase } from '../get-statistics.use-case';
import { StatisticsRepository } from '../../../domain/ports/statistics.repository';
import { type ThreatStatistics } from '../../../domain/models/threat-statistics.model';

const mockStats: ThreatStatistics = {
  totalThreats: 42,
  byType: { malware: 20, ddos: 22 },
  bySeverity: { critical: 5, high: 15, medium: 12, low: 10 },
  last24Hours: 8,
  criticalActive: 5,
};

describe('GetStatisticsUseCase', () => {
  let useCase: GetStatisticsUseCase;
  let mockRepository: { getStatistics: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRepository = { getStatistics: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        GetStatisticsUseCase,
        { provide: StatisticsRepository, useValue: mockRepository },
      ],
    });

    useCase = TestBed.inject(GetStatisticsUseCase);
  });

  // Given a mock StatisticsRepository that returns of(mockStats)
  // When execute() is called once
  // Then StatisticsRepository.getStatistics() is called exactly 1 time
  // And the emitted value deep-equals mockStats
  it('should delegate to repository and return its value', async () => {
    mockRepository.getStatistics.mockReturnValue(of(mockStats));

    const result = await firstValueFrom(useCase.execute());

    expect(result).toEqual(mockStats);
    expect(mockRepository.getStatistics).toHaveBeenCalledTimes(1);
  });

  // Given a mock StatisticsRepository that returns throwError(() => new Error('DB error'))
  // When the observable returned by execute() is subscribed
  // Then the error callback receives Error('DB error')
  // And the complete callback is NOT called
  it('should propagate repository errors without swallowing them', async () => {
    mockRepository.getStatistics.mockReturnValue(
      throwError(() => new Error('DB error'))
    );

    await expect(firstValueFrom(useCase.execute())).rejects.toThrow('DB error');
  });

  it('should call getStatistics exactly once per execute() call', async () => {
    mockRepository.getStatistics.mockReturnValue(of(mockStats));

    await firstValueFrom(useCase.execute());

    expect(mockRepository.getStatistics).toHaveBeenCalledTimes(1);
  });
});
