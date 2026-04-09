// Tipo de prueba: Integración
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, NEVER, throwError, BehaviorSubject, firstValueFrom } from 'rxjs';
import { StatisticsWidgetComponent } from './statistics-widget.component';
import { GetStatisticsUseCase } from '../../../../core/application/use-cases/get-statistics.use-case';
import { WebSocketService } from '../../../../core/infrastructure/services/websocket.service';
import { type ThreatStatistics, EMPTY_STATISTICS } from '../../../../core/domain/models/threat-statistics.model';

const mockStats: ThreatStatistics = {
  totalThreats: 42,
  byType: { malware: 20, ddos: 22 },
  bySeverity: { critical: 5, high: 15, medium: 12, low: 10 },
  last24Hours: 8,
  criticalActive: 5,
};

describe('StatisticsWidgetComponent', () => {
  let fixture: ComponentFixture<StatisticsWidgetComponent>;
  let mockExecute:      ReturnType<typeof vi.fn>;
  let mockGetMessages$: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    TestBed.resetTestingModule();

    mockExecute      = vi.fn().mockReturnValue(of(mockStats));
    mockGetMessages$ = vi.fn().mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports:   [StatisticsWidgetComponent],
      providers: [
        { provide: GetStatisticsUseCase, useValue: { execute: mockExecute      } },
        { provide: WebSocketService,     useValue: { getMessages$: mockGetMessages$ } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsWidgetComponent);
    fixture.detectChanges();
  });

  it('should render totalThreats value', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="total-threats"]')?.textContent).toContain('42');
  });

  it('should render criticalActive value', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="critical-active"]')?.textContent).toContain('5');
  });

  it('should render last24Hours value', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="last-24h"]')?.textContent).toContain('8');
  });

  it('should render without throwing when observable has not emitted', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports:   [StatisticsWidgetComponent],
      providers: [
        { provide: GetStatisticsUseCase, useValue: { execute: vi.fn().mockReturnValue(NEVER) } },
        { provide: WebSocketService,     useValue: { getMessages$: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();
    const f = TestBed.createComponent(StatisticsWidgetComponent);
    expect(() => f.detectChanges()).not.toThrow();
  });

  it('should use EMPTY_STATISTICS when API call fails', async () => {
    TestBed.resetTestingModule();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports:   [StatisticsWidgetComponent],
      providers: [
        { provide: GetStatisticsUseCase, useValue: { execute: vi.fn().mockReturnValue(throwError(() => new Error('API failure'))) } },
        { provide: WebSocketService,     useValue: { getMessages$: vi.fn().mockReturnValue(of([])) } },
      ],
    }).compileComponents();

    const f = TestBed.createComponent(StatisticsWidgetComponent);
    f.detectChanges();
    const result = await firstValueFrom(f.componentInstance.statistics$);

    expect(result).toEqual(EMPTY_STATISTICS);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[StatisticsWidgetComponent] Failed to load statistics',
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  describe('emptyStats property', () => {
    it('should expose EMPTY_STATISTICS constant', () => {
      expect(fixture.componentInstance.emptyStats).toEqual(EMPTY_STATISTICS);
    });
  });

  describe('WebSocket reactive refresh', () => {
    it('should call execute() again when WebSocket messages count increases', async () => {
      TestBed.resetTestingModule();
      const messages$  = new BehaviorSubject<unknown[]>([]);
      let callCount    = 0;
      const execFn     = vi.fn().mockImplementation(() => { callCount++; return of(mockStats); });

      await TestBed.configureTestingModule({
        imports:   [StatisticsWidgetComponent],
        providers: [
          { provide: GetStatisticsUseCase, useValue: { execute: execFn } },
          { provide: WebSocketService,     useValue: { getMessages$: vi.fn().mockReturnValue(messages$.asObservable()) } },
        ],
      }).compileComponents();

      const f = TestBed.createComponent(StatisticsWidgetComponent);
      f.detectChanges();
      const callsAfterInit = callCount;

      messages$.next([{ eventId: 'evt-1' }]);
      f.detectChanges();

      expect(callCount).toBeGreaterThan(callsAfterInit);
    });

    it('should NOT call execute() again when messages count stays the same', async () => {
      TestBed.resetTestingModule();
      const messages$  = new BehaviorSubject<unknown[]>([{ eventId: 'evt-1' }]);
      let callCount    = 0;
      const execFn     = vi.fn().mockImplementation(() => { callCount++; return of(mockStats); });

      await TestBed.configureTestingModule({
        imports:   [StatisticsWidgetComponent],
        providers: [
          { provide: GetStatisticsUseCase, useValue: { execute: execFn } },
          { provide: WebSocketService,     useValue: { getMessages$: vi.fn().mockReturnValue(messages$.asObservable()) } },
        ],
      }).compileComponents();

      const f = TestBed.createComponent(StatisticsWidgetComponent);
      f.detectChanges();
      const callsAfterInit = callCount;

      messages$.next([{ eventId: 'evt-1' }]);
      f.detectChanges();

      expect(callCount).toBe(callsAfterInit);
    });

    it('should clean up subscriptions on destroy without throwing', () => {
      expect(() => fixture.destroy()).not.toThrow();
    });
  });
});
