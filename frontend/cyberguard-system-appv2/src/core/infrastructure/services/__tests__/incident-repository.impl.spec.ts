import { describe, it, expect, beforeEach, afterEach} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { IncidentRepositoryImpl } from '../incident-repository.impl';


describe('IncidentRepositoryImpl', () => {
  let repository: IncidentRepositoryImpl;
  let httpController: HttpTestingController;

  const API_URL = 'http://localhost:3000/api/incidents';

  const mockIncident = {
    id: 'inc-1', threatId: 'thr-1', title: 'malware desde 10.0.0.1',
    status: 'open', severity: 'high', type: 'malware',
    sourceIp: '10.0.0.1', description: 'Malware detected',
    createdBy: 'user-1', assignedTo: null,
    createdAt: '2026-04-02T10:00:00Z', updatedAt: '2026-04-02T10:00:00Z',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [IncidentRepositoryImpl, provideHttpClient(), provideHttpClientTesting()],
    });
    repository     = TestBed.inject(IncidentRepositoryImpl);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpController.verify(); });

  describe('getIncidents()', () => {
    it('should GET /api/incidents without params when no filters', async () => {
      const promise = firstValueFrom(repository.getIncidents());

      const req = httpController.expectOne(API_URL);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toHaveLength(0);
      req.flush({ incidents: [mockIncident], total: 1 });

      const result = await promise;
      expect(result.total).toBe(1);
      expect(result.incidents[0].id).toBe('inc-1');
    });

    it('should append status query param when filter provided', async () => {
      const promise = firstValueFrom(repository.getIncidents({ status: 'open' }));

      const req = httpController.expectOne(`${API_URL}?status=open`);
      expect(req.request.params.get('status')).toBe('open');
      req.flush({ incidents: [mockIncident], total: 1 });

      await promise;
    });

    it('should append severity query param when filter provided', async () => {
      const promise = firstValueFrom(repository.getIncidents({ severity: 'critical' }));

      const req = httpController.expectOne(`${API_URL}?severity=critical`);
      expect(req.request.params.get('severity')).toBe('critical');
      req.flush({ incidents: [], total: 0 });

      await promise;
    });

    it('should append both params when both filters provided', async () => {
      const promise = firstValueFrom(repository.getIncidents({ status: 'open', severity: 'high' }));

      const req = httpController.expectOne(r => r.url === API_URL);
      expect(req.request.params.get('status')).toBe('open');
      expect(req.request.params.get('severity')).toBe('high');
      req.flush({ incidents: [mockIncident], total: 1 });

      await promise;
    });

    it('should return empty list when no incidents match', async () => {
      const promise = firstValueFrom(repository.getIncidents({ status: 'closed' }));

      const req = httpController.expectOne(`${API_URL}?status=closed`);
      req.flush({ incidents: [], total: 0 });

      const result = await promise;
      expect(result.total).toBe(0);
      expect(result.incidents).toHaveLength(0);
    });
  });

  describe('createIncident()', () => {
    it('should POST /api/incidents with threatId and return created incident', async () => {
      const request = { threatId: 'thr-uuid-high' };
      const promise = firstValueFrom(repository.createIncident(request));

      const req = httpController.expectOne(API_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush({ success: true, incident: mockIncident });

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.incident.status).toBe('open');
      expect(result.incident.severity).toBe('high');
    });

    it('should propagate HTTP 422 error for insufficient severity', async () => {
      const request  = { threatId: 'thr-low' };
      const promise  = firstValueFrom(repository.createIncident(request));

      const req = httpController.expectOne(API_URL);
      req.flush({ error: 'Solo amenazas con severidad ALTA o CRÍTICA' }, { status: 422, statusText: 'Unprocessable Entity' });

      await expect(promise).rejects.toMatchObject({ status: 422 });
    });

    it('should propagate HTTP 409 error for duplicate active incident', async () => {
      const promise = firstValueFrom(repository.createIncident({ threatId: 'thr-dup' }));

      const req = httpController.expectOne(API_URL);
      req.flush({ error: 'Ya existe un incidente activo' }, { status: 409, statusText: 'Conflict' });

      await expect(promise).rejects.toMatchObject({ status: 409 });
    });
  });
});
