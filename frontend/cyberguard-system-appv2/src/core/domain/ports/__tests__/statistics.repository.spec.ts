import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { StatisticsRepository } from '../statistics.repository';
import { EMPTY_STATISTICS, type ThreatStatistics } from '../../models/threat-statistics.model';

// Concrete stub to verify abstract class contract
class StubStatisticsRepository extends StatisticsRepository {
  getStatistics() {
    return of(EMPTY_STATISTICS);
  }

  getStatisticsSafe() {
    return of(EMPTY_STATISTICS);
  }
}

describe('StatisticsRepository', () => {
  it('should be usable as an Angular DI token', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: StatisticsRepository, useClass: StubStatisticsRepository }],
    });

    const repo = TestBed.inject(StatisticsRepository);
    expect(repo).toBeInstanceOf(StubStatisticsRepository);
  });

  it('concrete implementation must satisfy the getStatistics() contract', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: StatisticsRepository, useClass: StubStatisticsRepository }],
    });

    const repo = TestBed.inject(StatisticsRepository);
    const stats: ThreatStatistics = await firstValueFrom(repo.getStatistics());
    expect(stats).toEqual(EMPTY_STATISTICS);
  });
});
