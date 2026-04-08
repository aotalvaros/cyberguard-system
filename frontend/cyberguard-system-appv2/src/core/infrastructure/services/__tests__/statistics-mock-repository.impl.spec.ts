import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { firstValueFrom } from 'rxjs';
import { StatisticsMockRepository } from '../statistics-mock-repository.impl';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('StatisticsMockRepository', () => {
  let repository: StatisticsMockRepository;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    repository = TestBed.inject(StatisticsMockRepository);
  });

  describe('getStatistics()', () => {
    it('should return an Observable with mock statistics', async () => {
      const stats = await firstValueFrom(repository.getStatistics());
      expect(stats).toBeDefined();
      expect(stats.totalThreats).toBe(15);
    });

    it('should return correct byType breakdown', async () => {
      const stats = await firstValueFrom(repository.getStatistics());
      expect(stats.byType['malware']).toBe(6);
      expect(stats.byType['ddos']).toBe(5);
      expect(stats.byType['phishing']).toBe(4);
    });

    it('should return correct bySeverity breakdown', async () => {
      const stats = await firstValueFrom(repository.getStatistics());
      expect(stats.bySeverity['critical']).toBe(3);
      expect(stats.bySeverity['high']).toBe(6);
    });

    it('should return correct last24Hours count', async () => {
      const stats = await firstValueFrom(repository.getStatistics());
      expect(stats.last24Hours).toBe(5);
    });

    it('should return correct criticalActive count', async () => {
      const stats = await firstValueFrom(repository.getStatistics());
      expect(stats.criticalActive).toBe(3);
    });
  });

  describe('getStatisticsSafe()', () => {
    it('should return the same mock data as getStatistics()', async () => {
      const [safe, regular] = await Promise.all([
        firstValueFrom(repository.getStatisticsSafe()),
        firstValueFrom(repository.getStatistics()),
      ]);
      expect(safe).toEqual(regular);
    });

    it('should never throw and always return statistics', async () => {
      await expect(firstValueFrom(repository.getStatisticsSafe())).resolves.toBeDefined();
    });
  });
});
