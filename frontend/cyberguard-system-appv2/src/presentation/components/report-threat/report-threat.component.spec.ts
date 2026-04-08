// Tipo de prueba: Unitaria
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { of, throwError } from 'rxjs';
import { ReportThreatComponent } from './report-threat.component';
import { ReportThreatUseCase } from '../../../core/application/use-cases/report-threat.use-case';
import { ThreatValidationFactory } from '../../../shared/factories/threat-validation.factory';
import { Router } from '@angular/router';
import { ThreatType } from '../../../core/domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../core/domain/models/threat-severity.enum';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('ReportThreatComponent', () => {
  let fixture: ComponentFixture<ReportThreatComponent>;
  let component: ReportThreatComponent;
  let mockReportThreatUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockValidationFactory: { createValidator: ReturnType<typeof vi.fn> };

  const mockValidator = { validate: vi.fn().mockReturnValue({ valid: true, errors: [] }) };

  beforeEach(async () => {
    mockReportThreatUseCase = { execute: vi.fn().mockReturnValue(of({ threatId: 'threat-abc' })) };
    mockRouter = { navigate: vi.fn() };
    mockValidationFactory = { createValidator: vi.fn().mockReturnValue(mockValidator) };
    mockValidator.validate.mockReturnValue({ valid: true, errors: [] });

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ReportThreatComponent],
      providers: [
        { provide: ReportThreatUseCase, useValue: mockReportThreatUseCase },
        { provide: ThreatValidationFactory, useValue: mockValidationFactory },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportThreatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('form initialization', () => {
    it('should initialize with default type MALWARE', () => {
      expect(component.threatForm.value.type).toBe(ThreatType.MALWARE);
    });

    it('should initialize with default severity MEDIUM', () => {
      expect(component.threatForm.value.severity).toBe(ThreatSeverity.MEDIUM);
    });

    it('should initialize sourceIp as empty', () => {
      expect(component.threatForm.value.sourceIp).toBe('');
    });

    it('should expose all threatTypes from enum', () => {
      expect(component.threatTypes).toContain(ThreatType.MALWARE);
      expect(component.threatTypes).toContain(ThreatType.DDOS);
      expect(component.threatTypes).toContain(ThreatType.PHISHING);
    });

    it('should expose all severityLevels from enum', () => {
      expect(component.severityLevels).toContain(ThreatSeverity.LOW);
      expect(component.severityLevels).toContain(ThreatSeverity.CRITICAL);
    });
  });

  describe('ipValidator', () => {
    it('should return null for a valid IPv4', () => {
      expect(component.ipValidator({ value: '192.168.1.1' } as any)).toBeNull();
    });

    it('should return null for empty value', () => {
      expect(component.ipValidator({ value: '' } as any)).toBeNull();
    });

    it('should return { ip: true } for 999.999.999.999', () => {
      expect(component.ipValidator({ value: '999.999.999.999' } as any)).toEqual({ ip: true });
    });

    it('should return { ip: true } for a hostname string', () => {
      expect(component.ipValidator({ value: 'localhost' } as any)).toEqual({ ip: true });
    });

    it('should accept edge case 0.0.0.0', () => {
      expect(component.ipValidator({ value: '0.0.0.0' } as any)).toBeNull();
    });

    it('should accept edge case 255.255.255.255', () => {
      expect(component.ipValidator({ value: '255.255.255.255' } as any)).toBeNull();
    });
  });

  describe('onSubmit', () => {
    it('should not call use case when form is invalid', () => {
      component.threatForm.patchValue({ sourceIp: '', description: '' });
      component.onSubmit();
      expect(mockReportThreatUseCase.execute).not.toHaveBeenCalled();
    });

    it('should populate validationErrors when factory validator fails', () => {
      mockValidator.validate.mockReturnValue({ valid: false, errors: ['Source IP is required for DDOS'] });
      component.threatForm.patchValue({
        type: ThreatType.DDOS,
        severity: ThreatSeverity.HIGH,
        sourceIp: '10.0.0.1',
        description: 'DDoS attack on main site',
      });
      component.onSubmit();
      expect(component.validationErrors()).toContain('Source IP is required for DDOS');
      expect(mockReportThreatUseCase.execute).not.toHaveBeenCalled();
    });

    it('should call reportThreatUseCase with the correct threat payload', () => {
      component.threatForm.patchValue({
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '192.168.0.5',
        targetIp: '10.0.0.2',
        description: 'Phishing attack with credential harvesting',
      });
      component.onSubmit();
      expect(mockReportThreatUseCase.execute).toHaveBeenCalledWith({
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '192.168.0.5',
        targetIp: '10.0.0.2',
        description: 'Phishing attack with credential harvesting',
      });
    });

    it('should set success message on successful submission', () => {
      component.threatForm.patchValue({
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '172.16.0.1',
        description: 'Malware detected on workstation',
      });
      component.onSubmit();
      expect(component.success()).toContain('threat-abc');
    });

    it('should reset form to defaults after successful submission', () => {
      component.threatForm.patchValue({
        type: ThreatType.RANSOMWARE,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '10.10.0.5',
        description: 'Ransomware critical attack discovered',
      });
      component.onSubmit();
      expect(component.threatForm.value.type).toBe(ThreatType.MALWARE);
      expect(component.threatForm.value.severity).toBe(ThreatSeverity.MEDIUM);
    });

    it('should set error signal on failure', () => {
      mockReportThreatUseCase.execute.mockReturnValue(
        throwError(() => ({ error: { message: 'Server unavailable' } }))
      );
      component.threatForm.patchValue({
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Test failure scenario here',
      });
      component.onSubmit();
      expect(component.error()).toBe('Server unavailable');
      expect(component.loading()).toBe(false);
    });

    it('should use default error message when no specific error is returned', () => {
      mockReportThreatUseCase.execute.mockReturnValue(throwError(() => ({})));
      component.threatForm.patchValue({
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Test default error message',
      });
      component.onSubmit();
      expect(component.error()).toBe('Error al reportar amenaza');
    });

    it('should omit targetIp from payload when empty', () => {
      component.threatForm.patchValue({
        type: ThreatType.INTRUSION,
        severity: ThreatSeverity.LOW,
        sourceIp: '10.0.0.1',
        targetIp: '',
        description: 'Intrusion detected in internal network',
      });
      component.onSubmit();
      expect(mockReportThreatUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ targetIp: undefined })
      );
    });
  });

  describe('goBack', () => {
    it('should navigate to /dashboard', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
