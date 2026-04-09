// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/infrastructure/services/auth.service';
import { WebSocketService } from '../../../core/infrastructure/services/websocket.service';
import { GetCurrentUserUseCase } from '../../../core/application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../../../core/application/use-cases/logout.use-case';


describe('App', () => {
  let mockAuthService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let mockWsService: { connect: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockAuthService = { isAuthenticated: vi.fn().mockReturnValue(false) };
    mockWsService = { connect: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: WebSocketService, useValue: mockWsService },
        { provide: GetCurrentUserUseCase, useValue: { execute: vi.fn().mockReturnValue(null) } },
        { provide: LogoutUseCase, useValue: { execute: vi.fn() } }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should connect to WebSocket when user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);
    
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // Triggers ngOnInit

    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockWsService.connect).toHaveBeenCalled();
  });

  it('should not connect to WebSocket when user is not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockWsService.connect).not.toHaveBeenCalled();
  });

  describe('showSidebar', () => {
    it('should return false when user is not authenticated (no token)', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);
      const mockGetCurrentUser = { execute: vi.fn().mockReturnValue(null) };

      TestBed.overrideProvider(GetCurrentUserUseCase, { useValue: mockGetCurrentUser });
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      // showSidebar requires isAuthenticated() AND getUser() — both must be truthy
      expect(app.showSidebar()).toBe(false);
    });

    it('debe retornar false cuando isAuthenticated() es false aunque getUser() tenga datos (regresión bug)', () => {
      // Regresión: antes del fix, showSidebar solo verificaba !!getUser(), lo que
      // permitía que el sidebar apareciera si había un user en localStorage aunque
      // el token no estuviera presente o la sesión hubiera expirado.
      mockAuthService.isAuthenticated.mockReturnValue(false);
      const mockGetCurrentUser = {
        execute: vi.fn().mockReturnValue({ username: 'admin', role: 'admin' }) // user en localStorage
      };

      TestBed.overrideProvider(GetCurrentUserUseCase, { useValue: mockGetCurrentUser });
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      expect(app.showSidebar()).toBe(false);
    });

    it('should return true when user is authenticated and has user data', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      const mockGetCurrentUser = {
        execute: vi.fn().mockReturnValue({ username: 'admin', role: 'admin' })
      };

      TestBed.overrideProvider(GetCurrentUserUseCase, { useValue: mockGetCurrentUser });
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      fixture.detectChanges();

      // URL inicial es '' en el router de prueba, no contiene '/autenticacion'
      expect(app.showSidebar()).toBe(true);
    });
  });
});
