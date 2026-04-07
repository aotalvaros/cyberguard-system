// Tipo de prueba: Integración
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { ComponentFixture } from '@angular/core/testing';
import { of, NEVER, throwError } from 'rxjs';
import { StatisticsWidgetComponent } from './statistics-widget.component';
import { GetStatisticsUseCase } from '../../../../core/application/use-cases/get-statistics.use-case';
import { type ThreatStatistics, EMPTY_STATISTICS } from '../../../../core/domain/models/threat-statistics.model';
import { firstValueFrom } from 'rxjs';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});


const mockStats: ThreatStatistics = {
  totalThreats: 42,
  byType: { malware: 20, ddos: 22 },
  bySeverity: { critical: 5, high: 15, medium: 12, low: 10 },
  last24Hours: 8,
  criticalActive: 5,
};

async function setupFixture(stats: ThreatStatistics | 'never' | 'error'): Promise<ComponentFixture<StatisticsWidgetComponent>> {
  let mockExecute;
  if (stats === 'never') {
    mockExecute = vi.fn().mockReturnValue(NEVER);
  } else if (stats === 'error') {
    mockExecute = vi.fn().mockReturnValue(throwError(() => new Error('API failure')));
  } else {
    mockExecute = vi.fn().mockReturnValue(of(stats));
  }

  const mockUseCase = { execute: mockExecute };

  await TestBed.configureTestingModule({
    imports: [StatisticsWidgetComponent],
    providers: [{ provide: GetStatisticsUseCase, useValue: mockUseCase }],
  }).compileComponents();

  const fixture = TestBed.createComponent(StatisticsWidgetComponent);
  fixture.detectChanges();
  return fixture;
}

describe('StatisticsWidgetComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  // Given execute() returns of({ totalThreats: 42, ... })
  // When fixture detects changes
  // Then element bound to totalThreats contains text "42"
  it('should render totalThreats value', async () => {
    const fixture = await setupFixture(mockStats);
    const el: HTMLElement = fixture.nativeElement;
    const totalEl = el.querySelector('[data-testid="total-threats"]');
    expect(totalEl?.textContent).toContain('42');
  });

  // Given execute() returns of({ criticalActive: 5, ... })
  // When fixture detects changes
  // Then element bound to criticalActive contains text "5"
  it('should render criticalActive value', async () => {
    const fixture = await setupFixture(mockStats);
    const el: HTMLElement = fixture.nativeElement;
    const critEl = el.querySelector('[data-testid="critical-active"]');
    expect(critEl?.textContent).toContain('5');
  });

  // Given execute() returns of({ last24Hours: 8, ... })
  // When fixture detects changes
  // Then element bound to last24Hours contains text "8"
  it('should render last24Hours value', async () => {
    const fixture = await setupFixture(mockStats);
    const el: HTMLElement = fixture.nativeElement;
    const recentEl = el.querySelector('[data-testid="last-24h"]');
    expect(recentEl?.textContent).toContain('8');
  });

  // Given execute() returns a never-emitting observable
  // When fixture detects changes
  // Then template renders without throwing (empty state / loading)
  it('should render without throwing when observable has not emitted', async () => {
    await expect(setupFixture('never')).resolves.toBeDefined();
  });

  // Given execute() throws an error
  // When fixture detects changes
  // Then component should use EMPTY_STATISTICS as fallback
  it('should use EMPTY_STATISTICS when API call fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fixture = await setupFixture('error');
    const component = fixture.componentInstance;
    
    const result = await firstValueFrom(component.statistics$);
    
    expect(result).toEqual(EMPTY_STATISTICS);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[StatisticsWidgetComponent] Failed to load statistics',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  describe('emptyStats property', () => {
    it('should expose EMPTY_STATISTICS constant', async () => {
      const fixture = await setupFixture(mockStats);
      const component = fixture.componentInstance;
      expect(component.emptyStats).toEqual(EMPTY_STATISTICS);
    });
  });
});
