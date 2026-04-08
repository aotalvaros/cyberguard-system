// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../auth.service';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../../application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../../application/use-cases/get-current-user.use-case';
import { AuthRepository } from '../../../domain/ports/auth.repository';
import { WebSocketService } from '../websocket.service';


describe('AuthService', () => {
  let service: AuthService;
  let mockLoginUseCase: Partial<LoginUseCase>;
  let mockLogoutUseCase: Partial<LogoutUseCase>;
  let mockGetCurrentUserUseCase: Partial<GetCurrentUserUseCase>;
  let mockAuthRepository: Partial<AuthRepository>;
  let mockWebSocketService: Partial<WebSocketService>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockLoginUseCase = { execute: vi.fn() };
    mockLogoutUseCase = { execute: vi.fn() };
    mockGetCurrentUserUseCase = { execute: vi.fn(), isAdmin: vi.fn() };
    mockAuthRepository = { getToken: vi.fn(), isAuthenticated: vi.fn() };
    mockWebSocketService = { connect: vi.fn(), disconnect: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: LoginUseCase, useValue: mockLoginUseCase },
        { provide: LogoutUseCase, useValue: mockLogoutUseCase },
        { provide: GetCurrentUserUseCase, useValue: mockGetCurrentUserUseCase },
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should login', () => {
    const response = { token: 'token', user: { username: 'admin', role: 'admin' } };
    mockLoginUseCase.execute = vi.fn().mockReturnValue(of(response));

    service.login('admin', 'pass').subscribe((result) => {
      expect(result).toEqual(response);
      expect(mockWebSocketService.connect).toHaveBeenCalled();
    });
  });

  it('should logout', () => {
    service.logout();
    expect(mockWebSocketService.disconnect).toHaveBeenCalled();
    expect(mockLogoutUseCase.execute).toHaveBeenCalled();
  });

  it('should check if user is admin', () => {
    mockGetCurrentUserUseCase.isAdmin = vi.fn().mockReturnValue(true);
    expect(service.isAdmin()).toBe(true);
  });
});
