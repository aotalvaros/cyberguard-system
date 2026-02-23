import { Component, inject, OnInit } from '@angular/core';
import { AsyncPipe, KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { Observable } from 'rxjs';
import { catchError, of } from 'rxjs';
import { GetStatisticsUseCase } from '../../../../core/application/use-cases/get-statistics.use-case';
import { ThreatStatistics, EMPTY_STATISTICS } from '../../../../core/domain/models/threat-statistics.model';

@Component({
  selector: 'app-statistics-widget',
  standalone: true,
  imports: [AsyncPipe, KeyValuePipe, NgFor, NgIf],
  templateUrl: './statistics-widget.component.html',
  styleUrl: './statistics-widget.component.scss',
})
export class StatisticsWidgetComponent implements OnInit {
  private readonly getStatisticsUseCase = inject(GetStatisticsUseCase);

  statistics$!: Observable<ThreatStatistics>;
  readonly emptyStats = EMPTY_STATISTICS;

  ngOnInit(): void {
    this.statistics$ = this.getStatisticsUseCase.execute().pipe(
      catchError((err) => {
        console.error('[StatisticsWidgetComponent] Failed to load statistics', err);
        return of(EMPTY_STATISTICS);
      })
    );
  }
}
