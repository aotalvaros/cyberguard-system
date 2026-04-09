import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AsyncPipe, KeyValuePipe, NgFor, NgIf } from '@angular/common';
import { Observable, Subject, switchMap, distinctUntilChanged, map, startWith } from 'rxjs';
import { catchError, of, takeUntil } from 'rxjs';
import { GetStatisticsUseCase } from '../../../../core/application/use-cases/get-statistics.use-case';
import { ThreatStatistics, EMPTY_STATISTICS } from '../../../../core/domain/models/threat-statistics.model';
import { WebSocketService } from '../../../../core/infrastructure/services/websocket.service';

@Component({
  selector: 'app-statistics-widget',
  standalone: true,
  imports: [AsyncPipe, KeyValuePipe, NgFor, NgIf],
  templateUrl: './statistics-widget.component.html',
  styleUrl: './statistics-widget.component.scss',
})
export class StatisticsWidgetComponent implements OnInit, OnDestroy {
  private readonly getStatisticsUseCase = inject(GetStatisticsUseCase);
  private readonly wsService = inject(WebSocketService);
  private readonly destroy$ = new Subject<void>();

  statistics$!: Observable<ThreatStatistics>;
  readonly emptyStats = EMPTY_STATISTICS;

  ngOnInit(): void {
    // Re-fetch statistics every time a new real-time alert arrives
    this.statistics$ = this.wsService.getMessages$().pipe(
      map(messages => messages.length),
      distinctUntilChanged(),
      startWith(0),
      switchMap(() =>
        this.getStatisticsUseCase.execute().pipe(
          catchError((err) => {
            console.error('[StatisticsWidgetComponent] Failed to load statistics', err);
            return of(EMPTY_STATISTICS);
          })
        )
      ),
      takeUntil(this.destroy$),
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
