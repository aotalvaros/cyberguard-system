import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { StatisticsRepository } from '../../domain/ports/statistics.repository';
import { ThreatStatistics, EMPTY_STATISTICS } from '../../domain/models/threat-statistics.model';
import { environment } from '@environments/environment';

interface StatisticsApiResponse {
  success: boolean;
  data: ThreatStatistics;
}

@Injectable({ providedIn: 'root' })
export class StatisticsRepositoryImpl extends StatisticsRepository {
  private readonly http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/statistics`;

  getStatistics(): Observable<ThreatStatistics> {
    return this.http
      .get<StatisticsApiResponse>(this.API_URL)
      .pipe(
        map((response) => response.data),
        catchError((err) => {
          console.error('[StatisticsRepositoryImpl] getStatistics failed', err);
          return throwError(() => err);
        })
      );
  }

  getStatisticsSafe(): Observable<ThreatStatistics> {
    return this.http
      .get<StatisticsApiResponse>(this.API_URL)
      .pipe(
        map((response) => response.data),
        catchError((err) => {
          console.error('[StatisticsRepositoryImpl] getStatistics failed — returning empty state', err);
          return [EMPTY_STATISTICS];
        })
      );
  }
}
