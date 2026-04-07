// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ThreatRepositoryImpl } from '../threat-repository.impl';
import { ThreatRequest } from '../../../domain/models/threat-request.model';
import { ThreatType } from '../../../domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../domain/models/threat-severity.enum';
import { firstValueFrom } from 'rxjs';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});


describe('ThreatRepositoryImpl', () => {
  let repository: ThreatRepositoryImpl;
  let httpTestingController: HttpTestingController;

  const API_URL = 'http://localhost:3000/api/threats';

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ThreatRepositoryImpl,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    repository = TestBed.inject(ThreatRepositoryImpl);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('reportThreat', () => {
    it('should send POST request and return ThreatResponse', async () => {
      const threat: ThreatRequest = {
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.100',
        description: 'Malware detected'
      };

      const mockResponse = {
        threatId: 'threat-123',
        status: 'created',
        message: 'Threat reported successfully'
      };

      const promise = firstValueFrom(repository.reportThreat(threat));

      const req = httpTestingController.expectOne(API_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Malware detected',
        targetIp: undefined,
        metadata: undefined
      });

      req.flush(mockResponse);

      const result = await promise;
      expect(result.threatId).toBe('threat-123');
    });

    it('should include optional fields in request', async () => {
      const threat: ThreatRequest = {
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '10.0.0.1',
        targetIp: '192.168.1.50',
        description: 'Phishing attempt',
        metadata: { source: 'email' }
      };

      const promise = firstValueFrom(repository.reportThreat(threat));

      const req = httpTestingController.expectOne(API_URL);
      expect(req.request.body.targetIp).toBe('192.168.1.50');
      expect(req.request.body.metadata).toEqual({ source: 'email' });

      req.flush({ threatId: 'threat-456' });
      await promise;
    });
  });

  describe('getThreats', () => {
    it('should send GET request and return ThreatList', async () => {
      const mockResponse = {
        threats: [
          {
            threatId: 'threat-1',
            type: 'malware',
            severity: 'high',
            sourceIp: '192.168.1.100',
            description: 'Malware detected',
            timestamp: '2026-02-19T10:00:00.000Z'
          },
          {
            threatId: 'threat-2',
            type: 'phishing',
            severity: 'low',
            sourceIp: '192.168.1.200',
            description: 'Phishing attempt',
            timestamp: '2026-02-19T11:00:00.000Z'
          }
        ],
        total: 2
      };

      const promise = firstValueFrom(repository.getThreats());

      const req = httpTestingController.expectOne(API_URL);
      expect(req.request.method).toBe('GET');

      req.flush(mockResponse);

      const result = await promise;
      expect(result.total).toBe(2);
      expect(result.threats).toHaveLength(2);
      expect(result.threats[0].threatId).toBe('threat-1');
      expect(result.threats[0].type).toBe(ThreatType.MALWARE);
      expect(result.threats[0].timestamp).toBeInstanceOf(Date);
    });

    it('should handle empty threat list', async () => {
      const mockResponse = {
        threats: [],
        total: 0
      };

      const promise = firstValueFrom(repository.getThreats());

      const req = httpTestingController.expectOne(API_URL);
      req.flush(mockResponse);

      const result = await promise;
      expect(result.total).toBe(0);
      expect(result.threats).toHaveLength(0);
    });
  });

  describe('deleteThreat', () => {
    it('should send DELETE request and return DeleteThreatResult', async () => {
      const threatId = 'threat-123';
      const mockResponse = {
        success: true,
        threatId: 'threat-123',
        message: 'Threat deleted successfully'
      };

      const promise = firstValueFrom(repository.deleteThreat(threatId));

      const req = httpTestingController.expectOne(`${API_URL}/${threatId}`);
      expect(req.request.method).toBe('DELETE');

      req.flush(mockResponse);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.threatId).toBe('threat-123');
      expect(result.message).toBe('Threat deleted successfully');
    });

    it('should handle delete with different threat IDs', async () => {
      const threatId = 'uuid-abc-123-xyz';

      const promise = firstValueFrom(repository.deleteThreat(threatId));

      const req = httpTestingController.expectOne(`${API_URL}/${threatId}`);
      expect(req.request.url).toContain(threatId);

      req.flush({ success: true, threatId, message: 'Deleted' });
      await promise;
    });
  });
});
