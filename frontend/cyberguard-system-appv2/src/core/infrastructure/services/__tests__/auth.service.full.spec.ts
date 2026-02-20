import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth.service';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { LogoutUseCase } from '../../../application/use-cases/logout.use-case';
import { GetCurrentUserUseCase } from '../../../application/use-cases/get-current-user.use-case';
import { AuthRepository } from '../../../domain/ports/auth.repository';
import { WebSocketService } from '../websocket.service';
import { of } from 'rxjs';
import { firstValueFrom } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let mockLoginUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockLogoutUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockGetCurrentUserUseCase: { 
    execute: ReturnType<typeof vi.fn>;
    isAdmin: ReturnType<typeof vi.fn>;
  };
  let mockAuthRepository: {
    getToken: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let mockWsService: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLoginUseCase = {
      execute: vi.fn().mockReturnValue(of({ token: 'test-token', user: { username: 'test', role: 'user' }}))
    };
    mockLogoutUseCase = {
      execute: vi.fn()
    };
    mockGetCurrentUserUseCase = {
      execute: vi.fn().mockReturnValue({ username: 'test', role: 'user' }),
      isAdmin: vi.fn().mockReturnValue(false)
    };
    mockAuthRepository = {
      getToken: vi.fn().mockReturnValue('test-token'),
      isAuthenticated: vi.fn().mockReturnValue(true)
    };
    mockWsService = {
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: LoginUseCase, useValue: mockLoginUseCase },
        { provide: LogoutUseCase, useValue: mockLogoutUseCase },
        { provide: GetCurrentUserUseCase, useValue: mockGetCurrentUserUseCase },
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: WebSocketService, useValue: mockWsService }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  describe('login', () => {
    it('should execute login use case and connect WebSocket', async () => {
      const result = await firstValueFrom(service.login('testuser', 'password123'));
      
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith({ 
        username: 'testuser', 
        password: 'password123' 
      });
      expect(mockWsService.connect).toHaveBeenCalled();
      expect(result.token).toBe('test-token');
    });
  });

  describe('logout', () => {
    it('should disconnect WebSocket and execute logout use case', () => {
      service.logout();
      expect(mockWsService.disconnect).toHaveBeenCalled();
      expect(mockLogoutUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('getToken', () => {
    it('should return token from repository', () => {
      const token = service.getToken();
      expect(mockAuthRepository.getToken).toHaveBeenCalled();
      expect(token).toBe('test-token');
    });

    it('should return null when no token', () => {
      mockAuthRepository.getToken.mockReturnValue(null);
      const token = service.getToken();
      expect(token).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user from use case', () => {
      const user = service.getCurrentUser();
      expect(mockGetCurrentUserUseCase.execute).toHaveBeenCalled();
      expect(user).toEqual({ username: 'test', role: 'user' });
    });

    it('should return null when no user', () => {
      mockGetCurrentUserUseCase.execute.mockReturnValue(null);
      const user = service.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('should return true when user is admin', () => {
      mockGetCurrentUserUseCase.isAdmin.mockReturnValue(true);
      expect(service.isAdmin()).toBe(true);
    });

    it('should return false when user is not admin', () => {
      mockGetCurrentUserUseCase.isAdmin.mockReturnValue(false);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when authenticated', () => {
      mockAuthRepository.isAuthenticated.mockReturnValue(true);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false when not authenticated', () => {
      mockAuthRepository.isAuthenticated.mockReturnValue(false);
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});
