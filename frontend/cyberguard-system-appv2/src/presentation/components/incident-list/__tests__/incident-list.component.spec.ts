import { describe, it, expect, vi, beforeEach, beforeAll} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { IncidentListComponent } from '../incident-list.component';
import { GetIncidentsUseCase } from '../../../../core/application/use-cases/get-incidents.use-case';
import { CreateIncidentUseCase } from '../../../../core/application/use-cases/create-incident.use-case';
import { GetCurrentUserUseCase } from '../../../../core/application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../../../core/application/use-cases/logout.use-case';
import { AppErrorType } from '../../../../core/infrastructure/handlers/global-error.handler';

const currentUser = { username: 'analyst', role: 'soc_analyst' };

const mockIncident = {
  id: 'inc-1', threatId: 'thr-1', title: 'malware desde 10.0.0.1',
  status: 'open', severity: 'high', type: 'malware',
  sourceIp: '10.0.0.1', description: 'Malware detected',
  createdBy: 'u1', assignedTo: null,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const makeAppError = (message: string, type = AppErrorType.SERVER) => ({
  type,
  message,
  statusCode: 500,
  timestamp: new Date(),
});

async function buildFixture(overrides: {
  getIncidentsResult?: ReturnType<typeof vi.fn>;
  userRole?: string;
} = {}): Promise<{ fixture: ComponentFixture<IncidentListComponent>; component: IncidentListComponent; mockGetIncidents: ReturnType<typeof vi.fn> }> {
  const mockGetIncidents = overrides.getIncidentsResult
    ?? vi.fn().mockReturnValue(of({ incidents: [mockIncident], total: 1 }));
  const role = overrides.userRole ?? 'soc_analyst';

  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [IncidentListComponent],
    providers: [
      { provide: GetIncidentsUseCase,   useValue: { execute: mockGetIncidents } },
      { provide: CreateIncidentUseCase, useValue: { execute: vi.fn().mockReturnValue(of({ incident: mockIncident })) } },
      { provide: GetCurrentUserUseCase, useValue: { execute: vi.fn().mockReturnValue({ username: 'analyst', role }) } },
      { provide: LogoutUseCase,         useValue: { execute: vi.fn() } },
      { provide: Router,                useValue: { navigate: vi.fn() } },
    ],
  }).compileComponents();

  const fixture   = TestBed.createComponent(IncidentListComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();
  return { fixture, component, mockGetIncidents };
}


beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('IncidentListComponent', () => {

  describe('loadIncidents — success', () => {
    let component: IncidentListComponent;

    beforeEach(async () => {
      ({ component } = await buildFixture());
    });

    it('should set loading to false after data arrives', () => {
      expect(component.loading).toBe(false);
    });

    it('should populate incidents array', () => {
      expect(component.incidents).toHaveLength(1);
      expect(component.incidents[0].id).toBe('inc-1');
    });

    it('should set total count', () => {
      expect(component.total).toBe(1);
    });

    it('should clear error on success', () => {
      expect(component.error).toBe('');
    });
  });

  describe('loadIncidents — 500 error (table does not exist)', () => {
    let component: IncidentListComponent;

    beforeEach(async () => {
      const errMock = vi.fn().mockReturnValue(throwError(() => makeAppError('Server error. Please try again later.')));
      ({ component } = await buildFixture({ getIncidentsResult: errMock }));
    });

    it('should set loading to false immediately on 500 error', () => {
      expect(component.loading).toBe(false);
    });

    it('should display AppError message from server error', () => {
      expect(component.error).toBe('Server error. Please try again later.');
    });

    it('should keep incidents array empty on error', () => {
      expect(component.incidents).toHaveLength(0);
    });
  });

  describe('loadIncidents — error without message field', () => {
    let component: IncidentListComponent;

    beforeEach(async () => {
      const errMock = vi.fn().mockReturnValue(throwError(() => ({})));
      ({ component } = await buildFixture({ getIncidentsResult: errMock }));
    });

    it('should use fallback message when AppError has no message', () => {
      expect(component.error).toBe('Error al cargar incidentes');
    });
  });

  describe('loadIncidents — network error', () => {
    let component: IncidentListComponent;

    beforeEach(async () => {
      const errMock = vi.fn().mockReturnValue(
        throwError(() => makeAppError('Unable to connect to the server. Please check your internet connection.', AppErrorType.NETWORK))
      );
      ({ component } = await buildFixture({ getIncidentsResult: errMock }));
    });

    it('should display network error message', () => {
      expect(component.error).toBe('Unable to connect to the server. Please check your internet connection.');
    });
  });

  describe('applyFilters', () => {
    let component: IncidentListComponent;
    let mockGetIncidents: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      ({ component, mockGetIncidents } = await buildFixture());
      mockGetIncidents.mockClear();
      mockGetIncidents.mockReturnValue(of({ incidents: [], total: 0 }));
    });

    it('should call execute with status filter', () => {
      component.filterForm.patchValue({ status: 'open', severity: '' });
      component.applyFilters();
      expect(mockGetIncidents).toHaveBeenCalledWith(expect.objectContaining({ status: 'open' }));
    });

    it('should call execute with severity filter', () => {
      component.filterForm.patchValue({ status: '', severity: 'critical' });
      component.applyFilters();
      expect(mockGetIncidents).toHaveBeenCalledWith(expect.objectContaining({ severity: 'critical' }));
    });

    it('should call execute with no filters when both are empty', () => {
      component.filterForm.patchValue({ status: '', severity: '' });
      component.applyFilters();
      expect(mockGetIncidents).toHaveBeenCalledWith({});
    });
  });

  describe('canCreate', () => {
    it('should return true for soc_analyst', async () => {
      const { component } = await buildFixture({ userRole: 'soc_analyst' });
      expect(component.canCreate()).toBe(true);
    });

    it('should return true for admin', async () => {
      const { component } = await buildFixture({ userRole: 'admin' });
      expect(component.canCreate()).toBe(true);
    });

    it('should return false for viewer', async () => {
      const { component } = await buildFixture({ userRole: 'viewer' });
      expect(component.canCreate()).toBe(false);
    });

    it('should return false for incident_handler', async () => {
      const { component } = await buildFixture({ userRole: 'incident_handler' });
      expect(component.canCreate()).toBe(false);
    });
  });

  describe('severity and status class helpers', () => {
    let component: IncidentListComponent;

    beforeEach(async () => {
      ({ component } = await buildFixture());
    });

    it('should return correct severity CSS class', () => {
      expect(component.getSeverityClass('critical')).toBe('severity-critical');
      expect(component.getSeverityClass('high')).toBe('severity-high');
    });

    it('should return correct status CSS class with underscore replaced', () => {
      expect(component.getStatusClass('in_containment')).toBe('status-in-containment');
      expect(component.getStatusClass('open')).toBe('status-open');
    });
  });

  describe('label helpers', () => {
    let component: IncidentListComponent;

    beforeEach(async () => {
      ({ component } = await buildFixture());
    });

    it('should return Spanish status label for known status', () => {
      expect(component.getStatusLabel('open')).toBe('Abierto');
      expect(component.getStatusLabel('in_containment')).toBe('En Contención');
      expect(component.getStatusLabel('resolved')).toBe('Resuelto');
      expect(component.getStatusLabel('escalated')).toBe('Escalado');
    });

    it('should return raw value for unknown status', () => {
      expect(component.getStatusLabel('custom_status')).toBe('custom_status');
    });

    it('should return Spanish severity label for known severity', () => {
      expect(component.getSeverityLabel('low')).toBe('Baja');
      expect(component.getSeverityLabel('medium')).toBe('Media');
      expect(component.getSeverityLabel('high')).toBe('Alta');
      expect(component.getSeverityLabel('critical')).toBe('Crítica');
    });

    it('should return raw value for unknown severity', () => {
      expect(component.getSeverityLabel('extreme')).toBe('extreme');
    });

    it('should return Spanish role label for known role', () => {
      expect(component.getRoleLabel('admin')).toBe('Administrador');
      expect(component.getRoleLabel('soc_analyst')).toBe('Analista SOC');
      expect(component.getRoleLabel('incident_manager')).toBe('Gerente de Incidentes');
      expect(component.getRoleLabel('ciso')).toBe('CISO');
    });

    it('should return raw value for unknown role', () => {
      expect(component.getRoleLabel('custom_role')).toBe('custom_role');
    });
  });

  describe('navigation helpers', () => {
    let component: IncidentListComponent;
    let mockRouter: { navigate: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
      mockRouter = { navigate: vi.fn() };
      TestBed.resetTestingModule();
      await TestBed.configureTestingModule({
        imports: [IncidentListComponent],
        providers: [
          { provide: GetIncidentsUseCase,   useValue: { execute: vi.fn().mockReturnValue(of({ incidents: [], total: 0 })) } },
          { provide: CreateIncidentUseCase, useValue: { execute: vi.fn() } },
          { provide: GetCurrentUserUseCase, useValue: { execute: vi.fn().mockReturnValue(currentUser) } },
          { provide: LogoutUseCase,         useValue: { execute: vi.fn() } },
          { provide: Router,                useValue: mockRouter },
        ],
      }).compileComponents();
      component = TestBed.createComponent(IncidentListComponent).componentInstance;
    });

    it('should navigate to /dashboard', () => {
      component.goToDashboard();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should navigate to /users', () => {
      component.goToUserManagement();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);
    });

    it('should navigate to /autenticacion on logout', () => {
      component.logout();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
    });
  });
});
