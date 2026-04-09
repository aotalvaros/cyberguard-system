import { describe, it, expect, vi, beforeEach} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError, firstValueFrom } from 'rxjs';
import { CreateIncidentUseCase } from '../create-incident.use-case';
import { IncidentRepository } from '../../../domain/ports/incident.repository';
import { CreateIncidentRequest, CreateIncidentResponse } from '../../../domain/models/incident.model';


describe('CreateIncidentUseCase', () => {
  let useCase: CreateIncidentUseCase;
  let mockRepository: { createIncident: ReturnType<typeof vi.fn> };

  const request: CreateIncidentRequest = { threatId: 'thr-uuid-high' };

  const mockResponse: CreateIncidentResponse = {
    success: true,
    incident: {
      id: 'inc-new', threatId: 'thr-uuid-high', title: 'malware desde 10.0.0.1',
      status: 'open', severity: 'high', type: 'malware',
      sourceIp: '10.0.0.1', description: 'Malware detected',
      createdBy: 'user-admin', createdByName: 'Admin User', assignedTo: null, assignedToName: null,
      createdAt: '2026-04-02T10:00:00Z', updatedAt: '2026-04-02T10:00:00Z',
    },
  };

  beforeEach(() => {
    mockRepository = { createIncident: vi.fn().mockReturnValue(of(mockResponse)) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CreateIncidentUseCase,
        { provide: IncidentRepository, useValue: mockRepository },
      ],
    });

    useCase = TestBed.inject(CreateIncidentUseCase);
  });

  it('should create incident and return the response', async () => {
    const result = await firstValueFrom(useCase.execute(request));

    expect(result.success).toBe(true);
    expect(result.incident.status).toBe('open');
    expect(result.incident.severity).toBe('high');
  });

  it('should delegate to IncidentRepository.createIncident() with request', async () => {
    await firstValueFrom(useCase.execute(request));

    expect(mockRepository.createIncident).toHaveBeenCalledWith(request);
  });

  it('should propagate 422 error when severity is insufficient', async () => {
    mockRepository.createIncident.mockReturnValue(
      throwError(() => ({ status: 422, error: { error: 'Solo amenazas con severidad ALTA o CRÍTICA pueden generar incidentes' } }))
    );

    await expect(firstValueFrom(useCase.execute({ threatId: 'thr-low' }))).rejects.toMatchObject({
      status: 422,
    });
  });

  it('should propagate 409 error when active incident already exists', async () => {
    mockRepository.createIncident.mockReturnValue(
      throwError(() => ({ status: 409, error: { error: 'Ya existe un incidente activo para esta amenaza' } }))
    );

    await expect(firstValueFrom(useCase.execute(request))).rejects.toMatchObject({
      status: 409,
    });
  });

  it('should propagate 404 error when threat does not exist', async () => {
    mockRepository.createIncident.mockReturnValue(
      throwError(() => ({ status: 404, error: { error: 'Threat not found' } }))
    );

    await expect(firstValueFrom(useCase.execute({ threatId: 'nonexistent' }))).rejects.toMatchObject({
      status: 404,
    });
  });
});
