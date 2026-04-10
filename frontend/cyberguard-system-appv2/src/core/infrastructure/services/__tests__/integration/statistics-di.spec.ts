// Tipo de prueba: Integración
import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { StatisticsRepository } from '../../../../domain/ports/statistics.repository';
import { StatisticsRepositoryImpl } from '../../statistics-repository.impl';


describe('StatisticsRepository DI registration', () => {
  // Given providers mirror app.config.ts
  // When TestBed.inject(StatisticsRepository) is called
  // Then the returned instance is StatisticsRepositoryImpl
  it('should resolve StatisticsRepository as StatisticsRepositoryImpl', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: StatisticsRepository, useClass: StatisticsRepositoryImpl },
      ],
    });

    const repo = TestBed.inject(StatisticsRepository);
    expect(repo).toBeInstanceOf(StatisticsRepositoryImpl);
  });
});
