import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ThreatService, ThreatRequest } from './threat.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environment';

describe('ThreatService', () => {
  let service: ThreatService;
  let httpMock: HttpTestingController;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getToken']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ThreatService,
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    service = TestBed.inject(ThreatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create service', () => {
    expect(service).toBeTruthy();
  });

  describe('reportThreat', () => {
    const mockPayload: ThreatRequest = {
      type: 'malware',
      severity: 'high',
      sourceIp: '192.168.1.100',
      targetIp: '10.0.0.1',
      description: 'Suspicious malware detected on endpoint',
      metadata: { source: 'test' }
    };

    it('should send threat report with auth token', (done) => {
      mockAuthService.getToken.and.returnValue('test-token-123');

      service.reportThreat(mockPayload).subscribe(response => {
        expect(response).toEqual({ threatId: 'threat-123' });
        done();
      });

      const apiBase = environment.apiBase || environment.baseUrl.replace(/\/auth\/?$/, '');
      const req = httpMock.expectOne(`${apiBase}/threats`);
      
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockPayload);
      expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
      
      req.flush({ threatId: 'threat-123' });
    });

    it('should send threat report without auth header if no token', (done) => {
      mockAuthService.getToken.and.returnValue(null);

      service.reportThreat(mockPayload).subscribe(response => {
        expect(response).toBeTruthy();
        done();
      });

      const apiBase = environment.apiBase || environment.baseUrl.replace(/\/auth\/?$/, '');
      const req = httpMock.expectOne(`${apiBase}/threats`);
      
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({ success: true });
    });

    it('should handle all threat types', (done) => {
      mockAuthService.getToken.and.returnValue('token');
      const types: Array<ThreatRequest['type']> = ['malware', 'intrusion', 'phishing', 'ddos', 'ransomware'];
      let completed = 0;

      types.forEach(type => {
        const payload: ThreatRequest = {
          type,
          severity: 'medium',
          sourceIp: '192.168.1.1',
          description: `Test ${type} threat`
        };

        service.reportThreat(payload).subscribe(() => {
          completed++;
          if (completed === types.length) done();
        });
      });

      const requests = httpMock.match(() => true);
      expect(requests.length).toBe(5);
      requests.forEach((req, i) => {
        expect(req.request.body.type).toBe(types[i]);
        req.flush({ threatId: `threat-${i}` });
      });
    });

    it('should handle all severity levels', (done) => {
      mockAuthService.getToken.and.returnValue('token');
      const severities: Array<ThreatRequest['severity']> = ['low', 'medium', 'high', 'critical'];
      let completed = 0;

      severities.forEach(severity => {
        const payload: ThreatRequest = {
          type: 'intrusion',
          severity,
          sourceIp: '192.168.1.1',
          description: `Test ${severity} threat`
        };

        service.reportThreat(payload).subscribe(() => {
          completed++;
          if (completed === severities.length) done();
        });
      });

      const requests = httpMock.match(() => true);
      expect(requests.length).toBe(4);
      requests.forEach((req, i) => {
        expect(req.request.body.severity).toBe(severities[i]);
        req.flush({ threatId: `threat-${i}` });
      });
    });

    it('should handle optional targetIp', (done) => {
      mockAuthService.getToken.and.returnValue('token');
      const payloadWithoutTarget: ThreatRequest = {
        type: 'phishing',
        severity: 'low',
        sourceIp: '192.168.1.1',
        description: 'Phishing attempt detected'
      };

      service.reportThreat(payloadWithoutTarget).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(() => true);
      expect(req.request.body.targetIp).toBeUndefined();
      req.flush({ success: true });
    });

    it('should handle optional metadata', (done) => {
      mockAuthService.getToken.and.returnValue('token');
      const payloadWithMetadata: ThreatRequest = {
        type: 'ransomware',
        severity: 'critical',
        sourceIp: '10.0.0.50',
        description: 'Ransomware encryption detected',
        metadata: {
          encryptedFiles: 150,
          ransomNote: 'pay.txt',
          detectionTime: '2024-01-15T10:30:00Z'
        }
      };

      service.reportThreat(payloadWithMetadata).subscribe(() => {
        done();
      });

      const req = httpMock.expectOne(() => true);
      expect(req.request.body.metadata).toEqual(payloadWithMetadata.metadata);
      req.flush({ threatId: 'ransom-001' });
    });

    it('should handle server errors', (done) => {
      mockAuthService.getToken.and.returnValue('token');

      service.reportThreat(mockPayload).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(500);
          done();
        }
      });

      const req = httpMock.expectOne(() => true);
      req.flush({ error: 'Internal server error' }, { status: 500, statusText: 'Server Error' });
    });

    it('should handle validation errors', (done) => {
      mockAuthService.getToken.and.returnValue('token');

      service.reportThreat(mockPayload).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.message).toContain('validation');
          done();
        }
      });

      const req = httpMock.expectOne(() => true);
      req.flush(
        { message: 'Validation failed: sourceIp is invalid' },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    it('should handle unauthorized errors', (done) => {
      mockAuthService.getToken.and.returnValue('invalid-token');

      service.reportThreat(mockPayload).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          done();
        }
      });

      const req = httpMock.expectOne(() => true);
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle network errors', (done) => {
      mockAuthService.getToken.and.returnValue('token');

      service.reportThreat(mockPayload).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.error.type).toBe('error');
          done();
        }
      });

      const req = httpMock.expectOne(() => true);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('API Base URL', () => {
    it('should use environment.apiBase if available', () => {
      const originalApiBase = environment.apiBase;
      (environment as any).apiBase = 'http://custom-api:3000';
      
      const newService = new ThreatService(
        TestBed.inject(HttpClientTestingModule) as any,
        mockAuthService
      );
      
      mockAuthService.getToken.and.returnValue('token');
      newService.reportThreat({
        type: 'malware',
        severity: 'low',
        sourceIp: '1.1.1.1',
        description: 'test'
      }).subscribe();

      const req = httpMock.expectOne('http://custom-api:3000/threats');
      expect(req.request.url).toBe('http://custom-api:3000/threats');
      req.flush({});

      (environment as any).apiBase = originalApiBase;
    });

    it('should fallback to baseUrl without /auth suffix', () => {
      const originalApiBase = environment.apiBase;
      delete (environment as any).apiBase;
      
      mockAuthService.getToken.and.returnValue('token');
      service.reportThreat({
        type: 'intrusion',
        severity: 'medium',
        sourceIp: '2.2.2.2',
        description: 'test'
      }).subscribe();

      const expectedBase = environment.baseUrl.replace(/\/auth\/?$/, '');
      const req = httpMock.expectOne(`${expectedBase}/threats`);
      expect(req.request.url).toContain('/threats');
      req.flush({});

      (environment as any).apiBase = originalApiBase;
    });
  });
});
