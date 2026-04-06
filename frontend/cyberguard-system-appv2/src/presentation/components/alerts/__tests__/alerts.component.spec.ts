// Tipo de prueba: Integración
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { of, BehaviorSubject } from 'rxjs';
import { AlertsComponent } from '../alerts.component';
import { WebSocketService } from '../../../../core/infrastructure/services/websocket.service';
import { AlertsDomainService } from '../../../../core/domain/services/alerts-domain.service';
import { AuthService } from '../../../../core/infrastructure/services/auth.service';
import { DeleteThreatUseCase } from '../../../../core/application/use-cases/delete-threat.use-case';
import { AlertMessage } from '../../../../core/domain/models/alert-message.model';
import { ConnectionStatus } from '../../../../core/domain/ports/websocket.repository';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

const mockAlerts: AlertMessage[] = [
  { eventId: 'evt-1', data: { threatId: 't-1', type: 'malware', severity: 'high', sourceIp: '192.168.1.1', description: 'Malware detected' }, timestamp: Date.now() },
  { eventId: 'evt-2', data: { threatId: 't-2', type: 'ddos', severity: 'critical', sourceIp: '10.0.0.1', description: 'DDoS attack' }, timestamp: Date.now() },
  { eventId: 'evt-3', data: { threatId: '', type: 'phishing', severity: 'low', sourceIp: '172.16.0.1', description: 'Phishing attempt' }, timestamp: Date.now() },
];

describe('AlertsComponent', () => {
  let fixture: ComponentFixture<AlertsComponent>;
  let component: AlertsComponent;
  let messagesSubject: BehaviorSubject<AlertMessage[]>;
  let statusSubject: BehaviorSubject<ConnectionStatus>;

  let mockWsService: {
    getMessages$: ReturnType<typeof vi.fn>;
    isConnected: ReturnType<typeof vi.fn>;
    deleteMessage: ReturnType<typeof vi.fn>;
    clearAll: ReturnType<typeof vi.fn>;
    getConnectionStatus$: ReturnType<typeof vi.fn>;
  };

  let mockAlertsDomain: {
    filterAlerts: ReturnType<typeof vi.fn>;
    exportToJSON: ReturnType<typeof vi.fn>;
    calculateStats: ReturnType<typeof vi.fn>;
    getSeverityClass: ReturnType<typeof vi.fn>;
    formatDate: ReturnType<typeof vi.fn>;
    getUniqueTypes: ReturnType<typeof vi.fn>;
  };

  let mockAuthService: { isAdmin: ReturnType<typeof vi.fn> };
  let mockDeleteThreatUseCase: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    messagesSubject = new BehaviorSubject<AlertMessage[]>(mockAlerts);
    statusSubject = new BehaviorSubject<ConnectionStatus>('CONNECTED');

    mockWsService = {
      getMessages$: vi.fn().mockReturnValue(messagesSubject.asObservable()),
      isConnected: vi.fn().mockReturnValue(true),
      deleteMessage: vi.fn(),
      clearAll: vi.fn(),
      getConnectionStatus$: vi.fn().mockReturnValue(statusSubject.asObservable()),
    };

    mockAlertsDomain = {
      filterAlerts: vi.fn().mockImplementation((alerts) => alerts),
      exportToJSON: vi.fn(),
      calculateStats: vi.fn().mockReturnValue({ total: 3, critical: 1 }),
      getSeverityClass: vi.fn().mockReturnValue('severity-high'),
      formatDate: vi.fn().mockReturnValue('2026-02-23 12:00'),
      getUniqueTypes: vi.fn().mockReturnValue(['malware', 'ddos', 'phishing']),
    };

    mockAuthService = { isAdmin: vi.fn().mockReturnValue(true) };
    mockDeleteThreatUseCase = { execute: vi.fn().mockReturnValue(of({ success: true })) };

    await TestBed.configureTestingModule({
      imports: [AlertsComponent],
      providers: [
        { provide: WebSocketService, useValue: mockWsService },
        { provide: AlertsDomainService, useValue: mockAlertsDomain },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DeleteThreatUseCase, useValue: mockDeleteThreatUseCase },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AlertsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('ngOnInit', () => {
    it('should subscribe to WebSocket messages on init', () => {
      expect(mockWsService.getMessages$).toHaveBeenCalled();
      expect(component.alerts).toEqual(mockAlerts);
    });

    it('should subscribe to connection status on init', () => {
      expect(mockWsService.getConnectionStatus$).toHaveBeenCalled();
      expect(component.connectionStatus).toBe('CONNECTED');
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe on destroy', () => {
      const unsubSpy = vi.spyOn(component['subscription']!, 'unsubscribe');
      component.ngOnDestroy();
      expect(unsubSpy).toHaveBeenCalled();
    });
  });

  describe('applyFilters', () => {
    it('should call domain service filterAlerts', () => {
      component.searchTerm = 'malware';
      component.filterType = 'malware';
      component.filterSeverity = 'high';

      component.applyFilters();

      expect(mockAlertsDomain.filterAlerts).toHaveBeenCalledWith(
        mockAlerts,
        'malware',
        'malware',
        'high'
      );
    });

    it('should reset currentPage to 1 after filtering', () => {
      component.currentPage = 5;
      component.applyFilters();
      expect(component.currentPage).toBe(1);
    });

    it('should calculate totalPages based on filtered results', () => {
      mockAlertsDomain.filterAlerts.mockReturnValue(new Array(25).fill(mockAlerts[0]));
      component.applyFilters();
      expect(component.totalPages).toBe(3); // 25 / 10 = 2.5 → ceil = 3
    });
  });

  describe('paginatedAlerts', () => {
    it('should return correct slice for current page', () => {
      component.filteredAlerts = mockAlerts;
      component.pageSize = 2;
      component.currentPage = 1;

      const paginated = component.paginatedAlerts;

      expect(paginated).toHaveLength(2);
      expect(paginated[0].eventId).toBe('evt-1');
    });

    it('should handle last page with fewer items', () => {
      component.filteredAlerts = mockAlerts;
      component.pageSize = 2;
      component.currentPage = 2;

      const paginated = component.paginatedAlerts;

      expect(paginated).toHaveLength(1);
      expect(paginated[0].eventId).toBe('evt-3');
    });
  });

  describe('nextPage', () => {
    it('should increment currentPage if not at last page', () => {
      component.currentPage = 1;
      component.totalPages = 3;

      component.nextPage();

      expect(component.currentPage).toBe(2);
    });

    it('should not increment past totalPages', () => {
      component.currentPage = 3;
      component.totalPages = 3;

      component.nextPage();

      expect(component.currentPage).toBe(3);
    });
  });

  describe('prevPage', () => {
    it('should decrement currentPage if not at first page', () => {
      component.currentPage = 2;

      component.prevPage();

      expect(component.currentPage).toBe(1);
    });

    it('should not decrement below 1', () => {
      component.currentPage = 1;

      component.prevPage();

      expect(component.currentPage).toBe(1);
    });
  });

  describe('isAdmin', () => {
    it('should return true when user is admin', () => {
      mockAuthService.isAdmin.mockReturnValue(true);
      expect(component.isAdmin).toBe(true);
    });

    it('should return false when user is not admin', () => {
      mockAuthService.isAdmin.mockReturnValue(false);
      expect(component.isAdmin).toBe(false);
    });
  });

  describe('deleteAlert', () => {
    it('should do nothing if user is not admin', () => {
      mockAuthService.isAdmin.mockReturnValue(false);

      component.deleteAlert(mockAlerts[0]);

      expect(mockDeleteThreatUseCase.execute).not.toHaveBeenCalled();
    });

    it('should call delete use case with threatId when present', () => {
      component.deleteAlert(mockAlerts[0]);

      expect(mockDeleteThreatUseCase.execute).toHaveBeenCalledWith('t-1');
    });

    it('should delete local message on backend success', () => {
      component.deleteAlert(mockAlerts[0]);

      // Observable completes synchronously with mock
      expect(mockWsService.deleteMessage).toHaveBeenCalledWith('evt-1');
    });

    it('should delete local message even on backend error (graceful degradation)', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate error path by returning observable that errors
      mockDeleteThreatUseCase.execute.mockReturnValue({
        subscribe: ({ error }: { error: (e: Error) => void }) => {
          error(new Error('Backend error'));
        },
      } as any);

      component.deleteAlert(mockAlerts[0]);

      expect(mockWsService.deleteMessage).toHaveBeenCalledWith('evt-1');
      consoleErrorSpy.mockRestore();
    });

    it('should delete locally if alert has no threatId', () => {
      component.deleteAlert(mockAlerts[2]); // evt-3 has empty threatId

      expect(mockDeleteThreatUseCase.execute).not.toHaveBeenCalled();
      expect(mockWsService.deleteMessage).toHaveBeenCalledWith('evt-3');
    });
  });

  describe('clearAll', () => {
    it('should do nothing if user is not admin', () => {
      mockAuthService.isAdmin.mockReturnValue(false);
      vi.spyOn(window, 'confirm');

      component.clearAll();

      expect(window.confirm).not.toHaveBeenCalled();
    });

    it('should prompt for confirmation', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      component.clearAll();

      expect(confirmSpy).toHaveBeenCalledWith('¿Eliminar todas las alertas?');
      confirmSpy.mockRestore();
    });

    it('should clear all alerts on confirmation', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      component.clearAll();

      expect(mockWsService.clearAll).toHaveBeenCalled();
    });

    it('should attempt to delete each alert with threatId from backend', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      component.clearAll();

      // mockAlerts[0] and mockAlerts[1] have threatId
      expect(mockDeleteThreatUseCase.execute).toHaveBeenCalledWith('t-1');
      expect(mockDeleteThreatUseCase.execute).toHaveBeenCalledWith('t-2');
    });

    it('should log error when delete fails during clearAll', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      // Make delete return an observable that errors
      mockDeleteThreatUseCase.execute.mockReturnValue({
        subscribe: ({ error }: { error: (e: Error) => void }) => {
          error(new Error('Delete failed'));
        },
      } as any);

      component.clearAll();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error eliminando threat:',
        expect.any(String),
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('exportToJSON', () => {
    it('should delegate to domain service', () => {
      component.filteredAlerts = mockAlerts;

      component.exportToJSON();

      expect(mockAlertsDomain.exportToJSON).toHaveBeenCalledWith(mockAlerts);
    });
  });

  describe('getStats', () => {
    it('should return stats from domain service', () => {
      component.filteredAlerts = mockAlerts;

      const stats = component.getStats();

      expect(mockAlertsDomain.calculateStats).toHaveBeenCalledWith(mockAlerts);
      expect(stats).toEqual({ total: 3, critical: 1 });
    });
  });

  describe('getSeverityClass', () => {
    it('should delegate to domain service', () => {
      const result = component.getSeverityClass('critical');

      expect(mockAlertsDomain.getSeverityClass).toHaveBeenCalledWith('critical');
      expect(result).toBe('severity-high');
    });
  });

  describe('formatDate', () => {
    it('should delegate to domain service', () => {
      const result = component.formatDate(1234567890);

      expect(mockAlertsDomain.formatDate).toHaveBeenCalledWith(1234567890);
      expect(result).toBe('2026-02-23 12:00');
    });
  });

  describe('getUniqueTypes', () => {
    it('should delegate to domain service', () => {
      const result = component.getUniqueTypes();

      expect(mockAlertsDomain.getUniqueTypes).toHaveBeenCalledWith(mockAlerts);
      expect(result).toEqual(['malware', 'ddos', 'phishing']);
    });
  });

  describe('getUniqueSeverities', () => {
    it('should return SEVERITY_LIST constant', () => {
      const result = component.getUniqueSeverities();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
