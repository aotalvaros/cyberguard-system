import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';

import { DashboardComponent } from '../dashboard.component';
import { StatisticsRepository } from '../../../../core/domain/ports/statistics.repository';
import { AuthRepository } from '../../../../core/domain/ports/auth.repository';
import { WebSocketRepository } from '../../../../core/domain/ports/websocket.repository';
import { ThreatRepository } from '../../../../core/domain/ports/threat.repository';
import { AuthService } from '../../../../core/infrastructure/services/auth.service';
import { AuthResponse } from '../../../../core/domain/models/auth-response.model';
import { User } from '../../../../core/domain/models/user.model';
import { AlertMessage } from '../../../../core/domain/models/alert-message.model';
import { WebSocketCommand } from '../../../../core/domain/models/websocket-command.model';
import { ThreatStatistics } from '../../../../core/domain/models/threat-statistics.model';
import { LoginCredentials } from '../../../../core/domain/models/login-credentials.model';
import { WS_COMMANDS, ROLES } from '../../../../environments/constants';
import { Router, provideRouter } from '@angular/router';

class StubStatisticsRepository extends StatisticsRepository {
  constructor(private stats: ThreatStatistics) {
    super();
  }

  getStatistics(): Observable<ThreatStatistics> {
    return of(this.stats);
  }

  getStatisticsSafe(): Observable<ThreatStatistics> {
    return of(this.stats);
  }
}

class InMemoryAuthRepository extends AuthRepository {
  private token: string | null = 'token-1';
  private user: User | null = { username: 'integration-admin', role: ROLES.ADMIN };

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    this.user = { username: credentials.username, role: ROLES.ADMIN };
    this.token = `token-${credentials.username}`;
    return of({ token: this.token, user: this.user });
  }

  saveToken(token: string): void { this.token = token; }
  getToken(): string | null { return this.token; }
  saveUser(user: User): void { this.user = user; }
  getUser(): User | null { return this.user; }
  clearAuth(): void { this.token = null; this.user = null; }
  isAuthenticated(): boolean { return Boolean(this.token); }
}

class AuthServiceStub {
  constructor(private readonly authRepository: AuthRepository) {}
  login(): Observable<AuthResponse> { return of({ token: 'token', user: this.authRepository.getUser()! }); }
  logout(): void {}
  getCurrentUser(): User | null { return this.authRepository.getUser(); }
  getToken(): string | null { return this.authRepository.getToken(); }
  isAdmin(): boolean { return this.authRepository.getUser()?.role === ROLES.ADMIN; }
  isAuthenticated(): boolean { return this.authRepository.isAuthenticated(); }
}

class InMemoryWebSocketRepository extends WebSocketRepository {
  private readonly stream = new BehaviorSubject<AlertMessage[]>([]);
  private connected = true;

  connect(): void { this.connected = true; }
  disconnect(): void { this.connected = false; }

  sendCommand(command: WebSocketCommand): void {
    if (command.type === WS_COMMANDS.CLEAR_ALL) { this.stream.next([]); return; }
    if (command.type === WS_COMMANDS.DELETE_ONE && command.id) {
      this.stream.next(this.stream.value.filter(a => a.eventId !== command.id));
    }
  }

  getMessages$(): Observable<AlertMessage[]> { return this.stream.asObservable(); }
  isConnected(): boolean { return this.connected; }
  pushAlert(alert: AlertMessage): void { this.stream.next([alert, ...this.stream.value]); }
}

class RouterStub {
  navigate = vi.fn();
}

describe('DashboardComponent Integration', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let statisticsRepository: StubStatisticsRepository;
  let authRepository: InMemoryAuthRepository;
  let wsRepository: InMemoryWebSocketRepository;

  const statistics: ThreatStatistics = {
    totalThreats: 42,
    criticalActive: 5,
    last24Hours: 7,
    byType: { ddos: 12, malware: 30 },
    bySeverity: { critical: 5, high: 10, medium: 15, low: 12 },
  };

  beforeEach(async () => {
    statisticsRepository = new StubStatisticsRepository(statistics);
    authRepository = new InMemoryAuthRepository();
    wsRepository = new InMemoryWebSocketRepository();

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: StatisticsRepository, useValue: statisticsRepository },
        { provide: AuthRepository, useValue: authRepository },
        { provide: WebSocketRepository, useValue: wsRepository },
        { provide: AuthService, useFactory: () => new AuthServiceStub(authRepository) },
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
    fixture.detectChanges();
  });

  it('should render statistics coming from GetStatisticsUseCase', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const totalThreats = element.querySelector('[data-testid="total-threats"]');
    const criticalActive = element.querySelector('[data-testid="critical-active"]');

    expect(totalThreats?.textContent?.trim()).toBe('42');
    expect(criticalActive?.textContent?.trim()).toBe('5');
  });

  it('should NOT render an inline threat form — reporting is delegated to /report-threat', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('form')).toBeNull();
  });

  it('should render the quick-action navigation card', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.quick-action-card')).not.toBeNull();
  });
});
