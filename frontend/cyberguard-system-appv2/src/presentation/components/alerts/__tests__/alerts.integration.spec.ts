// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AlertsComponent } from '../alerts.component';
import { WebSocketRepository, ConnectionStatus } from '../../../../core/domain/ports/websocket.repository';
import { AuthRepository } from '../../../../core/domain/ports/auth.repository';
import { ThreatRepository } from '../../../../core/domain/ports/threat.repository';
import { AlertMessage } from '../../../../core/domain/models/alert-message.model';
import { WebSocketCommand } from '../../../../core/domain/models/websocket-command.model';
import { WS_COMMANDS, ROLES } from '../../../../environments/constants';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});


class InMemoryWebSocketRepository extends WebSocketRepository {
  private stream = new BehaviorSubject<AlertMessage[]>([]);
  private connected = true;
  private status$ = new BehaviorSubject<ConnectionStatus>('CONNECTED');

  connect(): void { this.connected = true; this.status$.next('CONNECTED'); }
  disconnect(): void { this.connected = false; this.status$.next('DISCONNECTED'); }
  sendCommand(command: WebSocketCommand): void {
    if (command.type === WS_COMMANDS.CLEAR_ALL) {
      this.stream.next([]);
      return;
    }
    if (command.type === WS_COMMANDS.DELETE_ONE && command.id) {
      this.stream.next(this.stream.value.filter(a => a.eventId !== command.id));
    }
  }
  getMessages$(): Observable<AlertMessage[]> { return this.stream.asObservable(); }
  isConnected(): boolean { return this.connected; }
  getConnectionStatus$(): Observable<ConnectionStatus> { return this.status$.asObservable(); }

  push(alert: AlertMessage) { this.stream.next([alert, ...this.stream.value]); }
}

class InMemoryAuthRepository {
  private user = { username: 'admin', role: ROLES.ADMIN };
  login() { return of({ token: 't', user: this.user }); }
  saveToken() {}
  getToken() { return 't'; }
  saveUser(u: any) { this.user = u; }
  getUser() { return this.user; }
  clearAuth() { this.user = null as any; }
  isAuthenticated() { return true; }
}

class InMemoryThreatRepository {
  deleted: string[] = [];
  deleteThreat(id: string) {
    this.deleted.push(id);
    return of({ success: true, threatId: id, message: 'ok' });
  }
}

describe('AlertsComponent integration', () => {
  let fixture: ComponentFixture<AlertsComponent>;
  let wsRepo: InMemoryWebSocketRepository;
  let authRepo: InMemoryAuthRepository;
  let threatRepo: InMemoryThreatRepository;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    wsRepo = new InMemoryWebSocketRepository();
    authRepo = new InMemoryAuthRepository();
    threatRepo = new InMemoryThreatRepository();

    await TestBed.configureTestingModule({
      imports: [AlertsComponent],
      providers: [
        { provide: WebSocketRepository, useValue: wsRepo },
        { provide: AuthRepository, useValue: authRepo },
        { provide: ThreatRepository, useValue: threatRepo }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AlertsComponent);
    fixture.detectChanges();
  });

  it('should render incoming websocket alerts and allow admin to delete one', async () => {
    const component = fixture.componentInstance;

    const sample: AlertMessage = {
      eventId: 'e-1',
      timestamp: Date.now(),
      data: { threatId: 't-1', type: 'malware', severity: 'high', sourceIp: '1.2.3.4', description: 'desc' }
    };

    // Emit alert
    wsRepo.push(sample);
    await fixture.whenStable();
    fixture.detectChanges();

    // Should appear in component alerts
    expect(component.alerts.length).toBeGreaterThan(0);
    expect(component.alerts[0].eventId).toBe('e-1');

    // Delete as admin
    component.deleteAlert(sample);
    await fixture.whenStable();
    fixture.detectChanges();

    // Threat repo should have recorded a delete call
    expect((threatRepo as any).deleted).toContain('t-1');
    // WS repository should no longer contain the alert
    expect(component.alerts.find(a => a.eventId === 'e-1')).toBeUndefined();
  });

  it('clearAll should remove all alerts and send CLEAR_ALL command', async () => {
    const one: AlertMessage = { eventId: 'a1', timestamp: Date.now(), data: { threatId: 't1', type: 'phishing', severity: 'low', sourceIp: '1.1.1.1', description: 'x' } };
    const two: AlertMessage = { eventId: 'a2', timestamp: Date.now(), data: { threatId: 't2', type: 'ddos', severity: 'critical', sourceIp: '2.2.2.2', description: 'y' } };
    wsRepo.push(one); wsRepo.push(two);
    await fixture.whenStable(); fixture.detectChanges();

    // Spy on confirm to auto-approve
    const orig = window.confirm; (window as any).confirm = () => true;
    try {
      const component = fixture.componentInstance;
      component.clearAll();
      await fixture.whenStable(); fixture.detectChanges();
      expect(component.alerts.length).toBe(0);
    } finally { (window as any).confirm = orig; }
  });
});
