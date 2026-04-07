import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { StatisticsRepository } from '../../domain/ports/statistics.repository';
import { ThreatStatistics } from '../../domain/models/threat-statistics.model';

const MOCK_STATS: ThreatStatistics = {
  totalThreats: 15,
  byType: { malware: 6, ddos: 5, phishing: 4 },
  bySeverity: { critical: 3, high: 6, medium: 4, low: 2 },
  last24Hours: 5,
  criticalActive: 3,
};

@Injectable({ providedIn: 'root' })
export class StatisticsMockRepository extends StatisticsRepository {
  getStatistics(): Observable<ThreatStatistics> {
    return of(MOCK_STATS);
  }

  getStatisticsSafe(): Observable<ThreatStatistics> {
    return of(MOCK_STATS);
  }
}
