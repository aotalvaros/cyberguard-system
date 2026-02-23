import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { StatisticsRepositoryImpl } from '../statistics-repository.impl';
import { StatisticsRepository } from '../../../domain/ports/statistics.repository';
import { type ThreatStatistics } from '../../../domain/models/threat-statistics.model';
import { environment } from '@environments/environment';

const EXPECTED_URL = `${environment.apiUrl}/api/statistics`;

const mockStats: ThreatStatistics = {
  totalThreats: 42,
  byType: { malware: 20, ddos: 22 },
  bySeverity: { critical: 5, high: 15, medium: 12, low: 10 },
  last24Hours: 8,
  criticalActive: 5,
};

describe('StatisticsRepositoryImpl', () => {
  let repo: StatisticsRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        StatisticsRepositoryImpl,
        { provide: StatisticsRepository, useClass: StatisticsRepositoryImpl },
      ],
    });

    repo = TestBed.inject(StatisticsRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // Given HttpClientTestingModule and backend returns { success: true, data: mockStats }
  // When getStatistics() is called and the HTTP request is flushed
  // Then the observable emits only the `data` portion as ThreatStatistics
  // And the `success` field does NOT appear in the emitted value
  it('should unwrap the API envelope and return only the data field', async () => {
    const responsePromise = firstValueFrom(repo.getStatistics());

    const req = httpMock.expectOne(EXPECTED_URL);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: mockStats });

    const result = await responsePromise;
    expect(result).toEqual(mockStats);
    expect((result as unknown as Record<string, unknown>)['success']).toBeUndefined();
  });

  // Given HttpClientTestingModule and the endpoint returns status 401
  // When getStatistics() is called and flushed with the error
  // Then the observable errors with HttpErrorResponse
  // And HttpErrorResponse.status equals 401
  it('should propagate HTTP 401 as HttpErrorResponse', async () => {
    const responsePromise = firstValueFrom(repo.getStatistics());

    const req = httpMock.expectOne(EXPECTED_URL);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    await expect(responsePromise).rejects.toBeInstanceOf(HttpErrorResponse);
    await expect(responsePromise).rejects.toMatchObject({ status: 401 });
  });
});
