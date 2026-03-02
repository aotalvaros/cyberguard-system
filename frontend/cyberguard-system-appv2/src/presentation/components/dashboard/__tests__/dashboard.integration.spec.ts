import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { By } from '@angular/platform-browser';

import { DashboardComponent } from '../dashboard.component';
import { ThreatRepository } from '../../../../core/domain/ports/threat.repository';
import { StatisticsRepository } from '../../../../core/domain/ports/statistics.repository';
import { AuthRepository } from '../../../../core/domain/ports/auth.repository';
import { WebSocketRepository } from '../../../../core/domain/ports/websocket.repository';
import { AuthService } from '../../../../core/infrastructure/services/auth.service';
import { ThreatRequest } from '../../../../core/domain/models/threat-request.model';
import { ThreatResponse } from '../../../../core/domain/models/threat-response.model';
import { ThreatList } from '../../../../core/domain/models/threat-list.model';
import { DeleteThreatResult } from '../../../../core/domain/models/delete-threat-result.model';
import { ThreatType } from '../../../../core/domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../../core/domain/models/threat-severity.enum';
import { ThreatStatistics } from '../../../../core/domain/models/threat-statistics.model';
import { LoginCredentials } from '../../../../core/domain/models/login-credentials.model';
import { AuthResponse } from '../../../../core/domain/models/auth-response.model';
import { User } from '../../../../core/domain/models/user.model';
import { AlertMessage } from '../../../../core/domain/models/alert-message.model';
import { WebSocketCommand } from '../../../../core/domain/models/websocket-command.model';
import { WS_COMMANDS, ROLES } from '../../../../environments/constants';
import { Router } from '@angular/router';

class InMemoryThreatRepository extends ThreatRepository {
  reportedThreats: ThreatRequest[] = [];

  reportThreat(threat: ThreatRequest): Observable<ThreatResponse> {
    this.reportedThreats.push(threat);
    return of({ threatId: `th-${this.reportedThreats.length}` });
  }

  getThreats(): Observable<ThreatList> {
    return of({ threats: [], total: 0 });
  }

  deleteThreat(threatId: string): Observable<DeleteThreatResult> {
    return of({ success: true, threatId, message: 'deleted' });
  }
}

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

  saveToken(token: string): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  saveUser(user: User): void {
    this.user = user;
  }

  getUser(): User | null {
    return this.user;
  }

  clearAuth(): void {
    this.token = null;
    this.user = null;
  }

  isAuthenticated(): boolean {
    return Boolean(this.token);
  }
}

class AuthServiceStub {
  constructor(private readonly authRepository: AuthRepository) {}

  login(): Observable<AuthResponse> {
    return of({ token: 'token', user: this.authRepository.getUser()! });
  }

  logout(): void {}

  getCurrentUser(): User | null {
    return this.authRepository.getUser();
  }

  getToken(): string | null {
    return this.authRepository.getToken();
  }

  isAdmin(): boolean {
    return this.authRepository.getUser()?.role === ROLES.ADMIN;
  }

  isAuthenticated(): boolean {
    return this.authRepository.isAuthenticated();
  }
}

class InMemoryWebSocketRepository extends WebSocketRepository {
  private readonly stream = new BehaviorSubject<AlertMessage[]>([]);
  private connected = true;

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  sendCommand(command: WebSocketCommand): void {
    if (command.type === WS_COMMANDS.CLEAR_ALL) {
      this.stream.next([]);
      return;
    }

    if (command.type === WS_COMMANDS.DELETE_ONE && command.id) {
      this.stream.next(this.stream.value.filter(alert => alert.eventId !== command.id));
    }
  }

  getMessages$(): Observable<AlertMessage[]> {
    return this.stream.asObservable();
  }

  isConnected(): boolean {
    return this.connected;
  }

  pushAlert(alert: AlertMessage): void {
    this.stream.next([alert, ...this.stream.value]);
  }
}

class RouterStub {
  navigate = vi.fn();
}

describe('DashboardComponent Integration', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let threatRepository: InMemoryThreatRepository;
  let statisticsRepository: StubStatisticsRepository;
  let authRepository: InMemoryAuthRepository;
  let wsRepository: InMemoryWebSocketRepository;
  let router: RouterStub;

  const statistics: ThreatStatistics = {
    totalThreats: 42,
    criticalActive: 5,
    last24Hours: 7,
    byType: { ddos: 12, malware: 30 },
    bySeverity: { critical: 5, high: 10, medium: 15, low: 12 },
  };

  beforeEach(async () => {
    threatRepository = new InMemoryThreatRepository();
    statisticsRepository = new StubStatisticsRepository(statistics);
    authRepository = new InMemoryAuthRepository();
    wsRepository = new InMemoryWebSocketRepository();
    router = new RouterStub();

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ThreatRepository, useValue: threatRepository },
        { provide: StatisticsRepository, useValue: statisticsRepository },
        { provide: AuthRepository, useValue: authRepository },
        { provide: WebSocketRepository, useValue: wsRepository },
        { provide: AuthService, useFactory: () => new AuthServiceStub(authRepository) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
  });

  it('should execute ReportThreat workflow and show success feedback', () => {
    const component = fixture.componentInstance;

    // Given: a valid threat ready to be reported end-to-end
    component.threatForm.setValue({
      type: ThreatType.RANSOMWARE,
      severity: ThreatSeverity.CRITICAL,
      sourceIp: '10.10.0.5',
      targetIp: '10.10.0.10',
      description: 'Critical ransomware attack detected in production'
    });
    fixture.detectChanges();

    // When: the analyst submits the form
    const form = fixture.debugElement.query(By.css('form'));
    form.triggerEventHandler('ngSubmit', {});
    fixture.detectChanges();

    // Then: the domain chain hits the repository and UI shows the success message
    expect(threatRepository.reportedThreats).toHaveLength(1);
    expect(threatRepository.reportedThreats[0]).toMatchObject({
      type: ThreatType.RANSOMWARE,
      severity: ThreatSeverity.CRITICAL,
      sourceIp: '10.10.0.5',
      targetIp: '10.10.0.10'
    });

    const successBanner: HTMLElement | null = fixture.nativeElement.querySelector('.alert-success');
    expect(successBanner?.textContent).toContain('Amenaza reportada exitosamente');
    expect(component.loading).toBe(false);
    expect(component.error).toBe('');
  });

  it('should render statistics coming from GetStatisticsUseCase', async () => {
    // Given: statistics repository returns aggregated metrics used by the widget
    await fixture.whenStable();
    fixture.detectChanges();

    // When: the asynchronous pipe resolves the observable
    const element: HTMLElement = fixture.nativeElement;
    const totalThreats = element.querySelector('[data-testid="total-threats"]');
    const criticalActive = element.querySelector('[data-testid="critical-active"]');

    // Then: the widget prints the real values instead of placeholders
    expect(totalThreats?.textContent?.trim()).toBe('42');
    expect(criticalActive?.textContent?.trim()).toBe('5');
  });
});