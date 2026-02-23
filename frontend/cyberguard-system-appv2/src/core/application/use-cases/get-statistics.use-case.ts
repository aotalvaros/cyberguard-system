import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StatisticsRepository } from '../../domain/ports/statistics.repository';
import { ThreatStatistics } from '../../domain/models/threat-statistics.model';

@Injectable({ providedIn: 'root' })
export class GetStatisticsUseCase {
  private readonly repository = inject(StatisticsRepository);

  execute(): Observable<ThreatStatistics> {
    return this.repository.getStatistics();
  }
}
