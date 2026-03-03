// Tipo de prueba: Integración
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ThreatService } from './threat.service';
import { AuthService } from './auth.service';

describe('ThreatService', () => {
  let service: ThreatService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  
  const API_BASE = 'http://localhost:3000/api';

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getToken']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ThreatService,
        { provide: AuthService, useValue: authSpy }
      ]
    });
    
    service = TestBed.inject(ThreatService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('reportThreat', () => {
    it('should report threat successfully with valid payload', () => {
      const mockToken = 'valid.jwt.token';
      const threatData = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Malware detected in system'
      };
      const mockResponse = {
        message: 'Threat reported successfully',
        threatId: 'threat-123',
        status: 'processing'
      };

      authService.getToken.and.returnValue(mockToken);

      service.reportThreat(threatData).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${API_BASE}/threats`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(threatData);
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
      req.flush(mockResponse);
    });

    it('should handle unauthorized error (401)', () => {
      const mockToken = 'expired.jwt.token';
      const threatData = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test threat'
      };

      authService.getToken.and.returnValue(mockToken);

      service.reportThreat(threatData).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(401);
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/threats`);
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle validation error (400)', () => {
      const mockToken = 'valid.jwt.token';
      const invalidThreatData = {
        type: 'invalid-type',
        severity: 'high',
        sourceIp: 'not-an-ip',
        description: 'too short'
      };

      authService.getToken.and.returnValue(mockToken);

      service.reportThreat(invalidThreatData).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(400);
          expect(error.error.error).toContain('validation failed');
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/threats`);
      req.flush(
        { error: 'validation failed: type must be one of [malware, intrusion, phishing, ddos, ransomware]' },
        { status: 400, statusText: 'Bad Request' }
      );
    });

    it('should handle request without token', () => {
      const threatData = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test threat'
      };

      authService.getToken.and.returnValue(null);

      service.reportThreat(threatData).subscribe(response => {
        expect(response).toBeDefined();
      });

      const req = httpMock.expectOne(`${API_BASE}/threats`);
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({});
    });

    it('should handle network connectivity issues', () => {
      const threatData = {
        type: 'malware',
        severity: 'high',
        sourceIp: '192.168.1.100',
        description: 'Test threat'
      };

      authService.getToken.and.returnValue('token');

      service.reportThreat(threatData).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(0);
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/threats`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('threat type validation', () => {
    const validTypes = ['malware', 'intrusion', 'phishing', 'ddos', 'ransomware'];
    const validSeverities = ['low', 'medium', 'high', 'critical'];

    validTypes.forEach(type => {
      it(`should accept valid threat type: ${type}`, () => {
        const threatData = {
          type,
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Valid threat data'
        };

        authService.getToken.and.returnValue('token');

        service.reportThreat(threatData).subscribe();

        const req = httpMock.expectOne(`${API_BASE}/threats`);
        expect(req.request.body.type).toBe(type);
        req.flush({});
      });
    });

    validSeverities.forEach(severity => {
      it(`should accept valid severity level: ${severity}`, () => {
        const threatData = {
          type: 'malware',
          severity,
          sourceIp: '192.168.1.100',
          description: 'Valid threat data'
        };

        authService.getToken.and.returnValue('token');

        service.reportThreat(threatData).subscribe();

        const req = httpMock.expectOne(`${API_BASE}/threats`);
        expect(req.request.body.severity).toBe(severity);
        req.flush({});
      });
    });
  });
});