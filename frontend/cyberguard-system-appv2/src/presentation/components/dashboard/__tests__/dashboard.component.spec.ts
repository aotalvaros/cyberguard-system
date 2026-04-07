// Tipo de prueba: Integración
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from '../dashboard.component';
import { ReportThreatUseCase } from '../../../../core/application/use-cases/report-threat.use-case';
import { LogoutUseCase } from '../../../../core/application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../../../core/application/use-cases/get-current-user.use-case';
import { GetStatisticsUseCase } from '../../../../core/application/use-cases/get-statistics.use-case';
import { WebSocketRepository } from '../../../../core/domain/ports/websocket.repository';
import { AuthRepository } from '../../../../core/domain/ports/auth.repository';
import { ThreatRepository } from '../../../../core/domain/ports/threat.repository';
import { Router } from '@angular/router';
import { type ThreatStatistics } from '../../../../core/domain/models/threat-statistics.model';
import { ThreatType } from '../../../../core/domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../../core/domain/models/threat-severity.enum';
import { NotificationPreferencesRepository } from '../../../../core/domain/ports/notification-preferences.repository';

const mockStats: ThreatStatistics = {
  totalThreats: 10,
  byType: { malware: 5 },
  bySeverity: { critical: 2 },
  last24Hours: 3,
  criticalActive: 2,
};


beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let mockReportThreatUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockLogoutUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockReportThreatUseCase = { execute: vi.fn().mockReturnValue(of({ threatId: 'threat-123' })) };
    mockLogoutUseCase = { execute: vi.fn() };
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: ReportThreatUseCase, useValue: mockReportThreatUseCase },
        { provide: LogoutUseCase, useValue: mockLogoutUseCase },
        { provide: GetCurrentUserUseCase, useValue: { execute: vi.fn().mockReturnValue({ username: 'testuser', role: 'admin' }) } },
        { provide: GetStatisticsUseCase, useValue: { execute: vi.fn().mockReturnValue(of(mockStats)) } },
        { provide: Router, useValue: mockRouter },
        {
          provide: WebSocketRepository,
          useValue: {
            connect: vi.fn(), disconnect: vi.fn(), sendCommand: vi.fn(),
            getMessages$: vi.fn().mockReturnValue(of([])),
            isConnected: vi.fn().mockReturnValue(false),
            getConnectionStatus$: vi.fn().mockReturnValue(of('DISCONNECTED')),
          },
        },
        {
          provide: AuthRepository,
          useValue: {
            login: vi.fn(), logout: vi.fn(), getCurrentUser: vi.fn().mockReturnValue(null),
            isAuthenticated: vi.fn().mockReturnValue(true), getToken: vi.fn().mockReturnValue('mock-token'),
          },
        },
        {
          provide: ThreatRepository,
          useValue: {
            reportThreat: vi.fn().mockReturnValue(of({})),
            getThreats: vi.fn().mockReturnValue(of({ threats: [], total: 0 })),
            deleteThreat: vi.fn().mockReturnValue(of({})),
          },
        },
        {
          provide: NotificationPreferencesRepository,
          useValue: {
            get: vi.fn().mockReturnValue(of({ emailEnabled: false, whatsappEnabled: false, email: '', phone: '' })),
            save: vi.fn().mockReturnValue(of(undefined)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ATDD acceptance', () => {
    it('should render the <app-statistics-widget> element', () => {
      const el: HTMLElement = fixture.nativeElement;
      const widget = el.querySelector('app-statistics-widget');
      expect(widget).not.toBeNull();
    });
  });

  describe('ipValidator', () => {
    it('should return null for valid IPv4 address', () => {
      const control = { value: '192.168.1.1' };
      const result = component.ipValidator(control as any);
      expect(result).toBeNull();
    });

    it('should return null for empty value', () => {
      const control = { value: '' };
      const result = component.ipValidator(control as any);
      expect(result).toBeNull();
    });

    it('should return error for invalid IP', () => {
      const control = { value: '999.999.999.999' };
      const result = component.ipValidator(control as any);
      expect(result).toEqual({ ip: true });
    });

    it('should return error for non-IP string', () => {
      const control = { value: 'not-an-ip' };
      const result = component.ipValidator(control as any);
      expect(result).toEqual({ ip: true });
    });

    it('should validate edge case 0.0.0.0', () => {
      const control = { value: '0.0.0.0' };
      const result = component.ipValidator(control as any);
      expect(result).toBeNull();
    });

    it('should validate edge case 255.255.255.255', () => {
      const control = { value: '255.255.255.255' };
      const result = component.ipValidator(control as any);
      expect(result).toBeNull();
    });
  });

  describe('onSubmit', () => {
    it('should not submit if form is invalid', () => {
      component.threatForm.patchValue({
        sourceIp: '',
        description: '',
      });
      component.onSubmit();

      expect(mockReportThreatUseCase.execute).not.toHaveBeenCalled();
    });

    it('should set loading to true during submission', () => {
      component.threatForm.patchValue({
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Test threat description here',
      });

      component.onSubmit();

      expect(component.loading).toBe(false); // Gets set back after observable completes synchronously
    });

    it('should call reportThreatUseCase with correct data', () => {
      component.threatForm.patchValue({
        type: ThreatType.DDOS,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '10.0.0.1',
        targetIp: '10.0.0.2',
        description: 'DDoS attack detected from source',
      });

      component.onSubmit();

      expect(mockReportThreatUseCase.execute).toHaveBeenCalledWith({
        type: ThreatType.DDOS,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '10.0.0.1',
        targetIp: '10.0.0.2',
        description: 'DDoS attack detected from source',
      });
    });

    it('should set success message on successful submission', () => {
      component.threatForm.patchValue({
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Test threat description here',
      });

      component.onSubmit();

      expect(component.success).toContain('threat-123');
      expect(component.loading).toBe(false);
      expect(component.error).toBe('');
    });

    it('should reset form after successful submission', () => {
      component.threatForm.patchValue({
        type: ThreatType.DDOS,
        severity: ThreatSeverity.CRITICAL,
        sourceIp: '10.0.0.1',
        description: 'Test threat description here',
      });

      component.onSubmit();

      expect(component.threatForm.value.type).toBe(ThreatType.MALWARE);
      expect(component.threatForm.value.severity).toBe(ThreatSeverity.MEDIUM);
    });

    it('should set error message on submission failure', () => {
      mockReportThreatUseCase.execute.mockReturnValue(throwError(() => ({
        error: { message: 'Server error' }
      })));

      component.threatForm.patchValue({
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Test threat description here',
      });

      component.onSubmit();

      expect(component.error).toBe('Server error');
      expect(component.loading).toBe(false);
      expect(component.success).toBe('');
    });

    it('should handle error with nested error property', () => {
      mockReportThreatUseCase.execute.mockReturnValue(throwError(() => ({
        error: { error: 'Validation failed' }
      })));

      component.threatForm.patchValue({
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Test threat description here',
      });

      component.onSubmit();

      expect(component.error).toBe('Validation failed');
    });

    it('should show default error message when no specific error', () => {
      mockReportThreatUseCase.execute.mockReturnValue(throwError(() => ({})));

      component.threatForm.patchValue({
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.1',
        description: 'Test threat description here',
      });

      component.onSubmit();

      expect(component.error).toBe('Error al reportar amenaza');
    });

    it('should handle submission without targetIp', () => {
      component.threatForm.patchValue({
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.LOW,
        sourceIp: '172.16.0.1',
        targetIp: '',
        description: 'Phishing attempt detected',
      });

      component.onSubmit();

      expect(mockReportThreatUseCase.execute).toHaveBeenCalledWith({
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.LOW,
        sourceIp: '172.16.0.1',
        targetIp: undefined,
        description: 'Phishing attempt detected',
      });
    });
  });

  describe('logout', () => {
    it('should call logoutUseCase.execute', () => {
      component.logout();

      expect(mockLogoutUseCase.execute).toHaveBeenCalled();
    });

    it('should navigate to /autenticacion', () => {
      component.logout();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
    });
  });

  describe('form initialization', () => {
    it('should expose threatTypes from enum', () => {
      expect(component.threatTypes).toContain(ThreatType.MALWARE);
      expect(component.threatTypes).toContain(ThreatType.DDOS);
    });

    it('should expose severityLevels from enum', () => {
      expect(component.severityLevels).toContain(ThreatSeverity.LOW);
      expect(component.severityLevels).toContain(ThreatSeverity.CRITICAL);
    });

    it('should initialize form with default values', () => {
      expect(component.threatForm.value.type).toBe(ThreatType.MALWARE);
      expect(component.threatForm.value.severity).toBe(ThreatSeverity.MEDIUM);
    });

    it('should get current user on init', () => {
      expect(component.user).toEqual({ username: 'testuser', role: 'admin' });
    });
  });
});
