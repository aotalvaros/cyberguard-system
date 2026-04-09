import { describe, it, expect, vi, beforeEach} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { GetIncidentsUseCase } from '../get-incidents.use-case';
import { IncidentRepository } from '../../../domain/ports/incident.repository';
import { IncidentList } from '../../../domain/models/incident.model';


describe('GetIncidentsUseCase', () => {
  let useCase: GetIncidentsUseCase;
  let mockRepository: { getIncidents: ReturnType<typeof vi.fn> };

  const mockIncidentList: IncidentList = {
    incidents: [
      {
        id: 'inc-1', threatId: 'thr-1', title: 'malware desde 10.0.0.1',
        status: 'open', severity: 'high', type: 'malware',
        sourceIp: '10.0.0.1', description: 'Malware detected',
        createdBy: 'user-1', createdByName: 'User One', assignedTo: null, assignedToName: null,
        createdAt: '2026-04-02T10:00:00Z', updatedAt: '2026-04-02T10:00:00Z',
      },
    ],
    total: 1,
  };

  beforeEach(() => {
    mockRepository = { getIncidents: vi.fn().mockReturnValue(of(mockIncidentList)) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        GetIncidentsUseCase,
        { provide: IncidentRepository, useValue: mockRepository },
      ],
    });

    useCase = TestBed.inject(GetIncidentsUseCase);
  });

  it('should return incident list without filters', async () => {
    const result = await firstValueFrom(useCase.execute());

    expect(result.total).toBe(1);
    expect(result.incidents[0].title).toBe('malware desde 10.0.0.1');
    expect(mockRepository.getIncidents).toHaveBeenCalledWith(undefined);
  });

  it('should forward status filter to repository', async () => {
    await firstValueFrom(useCase.execute({ status: 'open' }));

    expect(mockRepository.getIncidents).toHaveBeenCalledWith({ status: 'open' });
  });

  it('should forward severity filter to repository', async () => {
    await firstValueFrom(useCase.execute({ severity: 'critical' }));

    expect(mockRepository.getIncidents).toHaveBeenCalledWith({ severity: 'critical' });
  });

  it('should forward combined filters to repository', async () => {
    await firstValueFrom(useCase.execute({ status: 'open', severity: 'high' }));

    expect(mockRepository.getIncidents).toHaveBeenCalledWith({ status: 'open', severity: 'high' });
  });

  it('should return empty list when no incidents match filters', async () => {
    mockRepository.getIncidents.mockReturnValue(of({ incidents: [], total: 0 }));

    const result = await firstValueFrom(useCase.execute({ status: 'closed' }));

    expect(result.total).toBe(0);
    expect(result.incidents).toHaveLength(0);
  });
});
