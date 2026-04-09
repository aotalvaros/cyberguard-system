import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ThreatStatistics } from '../models/threat-statistics.model';

@Injectable()
export abstract class StatisticsRepository {
  abstract getStatistics(): Observable<ThreatStatistics>;
  abstract getStatisticsSafe(): Observable<ThreatStatistics>;
}
