import {describe, it, expect, vi, beforeEach} from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardComponent } from '../dashboard.component';
import { GetCurrentUserUseCase } from '../../../../core/application/use-cases/get-current-user.use-case';
import { GetStatisticsUseCase } from '../../../../core/application/use-cases/get-statistics.use-case';
import { WebSocketRepository } from '../../../../core/domain/ports/websocket.repository';
import { AuthRepository } from '../../../../core/domain/ports/auth.repository';
import { ThreatRepository } from '../../../../core/domain/ports/threat.repository';
import { provideRouter } from '@angular/router';
import { type ThreatStatistics } from '../../../../core/domain/models/threat-statistics.model';
import { GetNotificationPreferencesUseCase } from '../../../../core/application/use-cases/get-notification-preferences.use-case';
import { SaveNotificationPreferencesUseCase } from '../../../../core/application/use-cases/save-notification-preferences.use-case';

const mockStats: ThreatStatistics = {
  totalThreats: 10,
  byType: { malware: 5 },
  bySeverity: { critical: 2 },
  last24Hours: 3,
  criticalActive: 2,
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: GetCurrentUserUseCase,
          useValue: { execute: vi.fn().mockReturnValue({ username: 'testuser', role: 'admin' }) },
        },
        {
          provide: GetNotificationPreferencesUseCase,
          useValue: { execute: vi.fn().mockReturnValue(of({ emailEnabled: false, whatsappEnabled: false, email: '', phone: '' })) },
        },
        {
          provide: SaveNotificationPreferencesUseCase,
          useValue: { execute: vi.fn().mockReturnValue(of(undefined)) },
        },
        {
          provide: GetStatisticsUseCase,
          useValue: { execute: vi.fn().mockReturnValue(of(mockStats)) },
        },
        {
          provide: WebSocketRepository,
          useValue: {
            connect: vi.fn(),
            disconnect: vi.fn(),
            sendCommand: vi.fn(),
            getMessages$: vi.fn().mockReturnValue(of([])),
            isConnected: vi.fn().mockReturnValue(false),
            getConnectionStatus$: vi.fn().mockReturnValue(of('CONNECTED')),
          },
        },
        {
          provide: AuthRepository,
          useValue: {
            login: vi.fn(),
            logout: vi.fn(),
            getCurrentUser: vi.fn().mockReturnValue(null),
            isAuthenticated: vi.fn().mockReturnValue(true),
            getToken: vi.fn().mockReturnValue('mock-token'),
          },
        },
        {
          provide: ThreatRepository,
          useValue: {
            reportThreat: vi.fn().mockReturnValue(of({})),
            getThreats: vi.fn().mockReturnValue(of({ threats: [] })),
            deleteThreat: vi.fn().mockReturnValue(of({ success: true })),
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
      expect(el.querySelector('app-statistics-widget')).not.toBeNull();
    });

    it('should render the quick-action navigation card linking to /report-threat', () => {
      const el: HTMLElement = fixture.nativeElement;
      const card = el.querySelector('.quick-action-card');
      expect(card).not.toBeNull();
      const href = card?.getAttribute('href') ?? card?.getAttribute('ng-reflect-router-link') ?? '';
      expect(href).toContain('report-threat');
    });

    it('should NOT render an inline threat form on the dashboard', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('form.threat-form')).toBeNull();
      expect(el.querySelector('app-report-threat')).toBeNull();
    });

    it('should display current user info', () => {
      expect(component.user).toEqual({ username: 'testuser', role: 'admin' });
    });

    it('should NOT render a logout button in the dashboard header', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.btn-logout')).toBeNull();
    });
  });
});
