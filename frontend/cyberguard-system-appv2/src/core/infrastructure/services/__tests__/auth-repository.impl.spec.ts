import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthRepositoryImpl } from '../auth-repository.impl';
import { LocalStorageAdapter } from '../../adapters/local-storage.adapter';
import { LoginCredentials } from '../../../domain/models/login-credentials.model';
import { User } from '../../../domain/models/user.model';
import { firstValueFrom } from 'rxjs';

describe('AuthRepositoryImpl', () => {
  let repository: AuthRepositoryImpl;
  let httpTestingController: HttpTestingController;
  let mockStorage: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  const API_URL = 'http://localhost:3000/api/auth';

  beforeEach(() => {
    mockStorage = {
      set: vi.fn(),
      get: vi.fn(),
      remove: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthRepositoryImpl,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LocalStorageAdapter, useValue: mockStorage }
      ]
    });

    repository = TestBed.inject(AuthRepositoryImpl);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('login', () => {
    it('should send login request and return AuthResponse', async () => {
      const credentials: LoginCredentials = {
        username: 'testuser',
        password: 'password123'
      };
      const mockResponse = {
        token: 'jwt-token-123',
        user: { username: 'testuser', role: 'user' }
      };

      const promise = firstValueFrom(repository.login(credentials));
      const req = httpTestingController.expectOne(`${API_URL}/login`);

      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        username: 'testuser',
        password: 'password123'
      });

      req.flush(mockResponse);
      const result = await promise;

      expect(result.token).toBe('jwt-token-123');
      expect(result.user.username).toBe('testuser');
    });
  });

  describe('saveToken', () => {
    it('should save token to storage', () => {
      repository.saveToken('my-token');
      expect(mockStorage.set).toHaveBeenCalledWith('token', 'my-token');
    });
  });

  describe('getToken', () => {
    it('should return token from storage', () => {
      mockStorage.get.mockReturnValue('stored-token');
      const result = repository.getToken();
      expect(mockStorage.get).toHaveBeenCalledWith('token');
      expect(result).toBe('stored-token');
    });

    it('should return null if no token', () => {
      mockStorage.get.mockReturnValue(null);
      const result = repository.getToken();
      expect(result).toBeNull();
    });
  });

  describe('saveUser', () => {
    it('should save user as JSON string', () => {
      const user: User = { username: 'testuser', role: 'admin' };
      repository.saveUser(user);
      expect(mockStorage.set).toHaveBeenCalledWith('user', JSON.stringify(user));
    });
  });

  describe('getUser', () => {
    it('should return parsed user from storage', () => {
      const user: User = { username: 'testuser', role: 'user' };
      mockStorage.get.mockReturnValue(JSON.stringify(user));
      const result = repository.getUser();
      expect(mockStorage.get).toHaveBeenCalledWith('user');
      expect(result).toEqual(user);
    });

    it('should return null if no user stored', () => {
      mockStorage.get.mockReturnValue(null);
      const result = repository.getUser();
      expect(result).toBeNull();
    });
  });

  describe('clearAuth', () => {
    it('should remove token and user from storage', () => {
      repository.clearAuth();
      expect(mockStorage.remove).toHaveBeenCalledWith('token');
      expect(mockStorage.remove).toHaveBeenCalledWith('user');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      mockStorage.get.mockReturnValue('valid-token');
      const result = repository.isAuthenticated();
      expect(result).toBe(true);
    });

    it('should return false when no token', () => {
      mockStorage.get.mockReturnValue(null);
      const result = repository.isAuthenticated();
      expect(result).toBe(false);
    });

    it('should return false for empty string token', () => {
      mockStorage.get.mockReturnValue('');
      const result = repository.isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
