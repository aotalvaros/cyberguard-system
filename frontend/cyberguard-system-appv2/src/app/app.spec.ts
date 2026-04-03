// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AuthService } from '../core/infrastructure/services/auth.service';
import { WebSocketService } from '../core/infrastructure/services/websocket.service';
import { GetCurrentUserUseCase } from '../core/application/use-cases/get-current-user.use-case';
import { LogoutUseCase } from '../core/application/use-cases/logout.use-case';

describe('App', () => {
  let mockAuthService: { isAuthenticated: ReturnType<typeof vi.fn> };
  let mockWsService: { connect: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
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
});
