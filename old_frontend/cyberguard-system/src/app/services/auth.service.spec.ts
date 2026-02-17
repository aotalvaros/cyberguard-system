import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService, LoginResponse } from './auth.service';
import { WsService } from './ws.service';
import { environment } from '../../../environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let mockWsService: jasmine.SpyObj<WsService>;
  let store: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    store = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      store[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete store[key];
    });

    // Mock WsService
    mockWsService = jasmine.createSpyObj('WsService', ['connect', 'disconnect']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: WsService, useValue: mockWsService }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Initialization', () => {
    it('should create service', () => {
      expect(service).toBeTruthy();
    });

    it('should connect WS if admin session exists on init', () => {
      store['user'] = JSON.stringify({ username: 'admin', role: 'admin' });
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      expect(mockWsService.connect).toHaveBeenCalled();
    });

    it('should connect WS if ADMIN (uppercase) session exists', () => {
      store['user'] = JSON.stringify({ username: 'admin', role: 'ADMIN' });
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      expect(mockWsService.connect).toHaveBeenCalled();
    });

    it('should not connect WS if non-admin session exists', () => {
      mockWsService.connect.calls.reset();
      store['user'] = JSON.stringify({ username: 'user', role: 'user' });
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      expect(mockWsService.connect).not.toHaveBeenCalled();
    });

    it('should handle malformed user data in localStorage', () => {
      store['user'] = 'invalid json';
      expect(() => {
        const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      }).not.toThrow();
    });
  });

  describe('Login', () => {
    it('should login successfully and save session', (done) => {
      const mockResponse: LoginResponse = {
        token: 'test-token-123',
        user: { username: 'admin', role: 'admin' }
      };

      service.login('admin', 'password123').subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token-123');
        expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.user));
        expect(mockWsService.connect).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'admin', password: 'password123' });
      req.flush(mockResponse);
    });

    it('should update user$ observable on login', (done) => {
      const mockResponse: LoginResponse = {
        token: 'token',
        user: { username: 'testuser', role: 'user' }
      };

      service.user$.subscribe(user => {
        if (user) {
          expect(user.username).toBe('testuser');
          done();
        }
      });

      service.login('testuser', 'pass').subscribe();

      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      req.flush(mockResponse);
    });

    it('should connect WS for admin role', (done) => {
      const mockResponse: LoginResponse = {
        token: 'token',
        user: { username: 'admin', role: 'admin' }
      };

      service.login('admin', 'pass').subscribe(() => {
        expect(mockWsService.connect).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      req.flush(mockResponse);
    });

    it('should connect WS for ADMIN role (uppercase)', (done) => {
      const mockResponse: LoginResponse = {
        token: 'token',
        user: { username: 'admin', role: 'ADMIN' }
      };

      service.login('admin', 'pass').subscribe(() => {
        expect(mockWsService.connect).toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      req.flush(mockResponse);
    });

    it('should not connect WS for non-admin users', (done) => {
      mockWsService.connect.calls.reset();
      const mockResponse: LoginResponse = {
        token: 'token',
        user: { username: 'user', role: 'user' }
      };

      service.login('user', 'pass').subscribe(() => {
        expect(mockWsService.connect).not.toHaveBeenCalled();
        done();
      });

      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      req.flush(mockResponse);
    });

    it('should handle login errors', (done) => {
      service.login('wrong', 'credentials').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.status).toBe(401);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      req.flush({ error: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle localStorage errors gracefully', (done) => {
      (localStorage.setItem as jasmine.Spy).and.throwError('Storage full');

      const mockResponse: LoginResponse = {
        token: 'token',
        user: { username: 'admin', role: 'admin' }
      };

      service.login('admin', 'pass').subscribe(() => {
        // Should not throw even if localStorage fails
        expect(true).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      req.flush(mockResponse);
    });
  });

  describe('Logout', () => {
    it('should clear session and disconnect WS', () => {
      store['token'] = 'test-token';
      store['user'] = JSON.stringify({ username: 'admin', role: 'admin' });

      service.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(mockWsService.disconnect).toHaveBeenCalled();
    });

    it('should update user$ observable to null', (done) => {
      service.logout();

      service.user$.subscribe(user => {
        expect(user).toBeNull();
        done();
      });
    });

    it('should handle WS disconnect errors gracefully', () => {
      mockWsService.disconnect.and.throwError('WS error');
      expect(() => service.logout()).not.toThrow();
    });
  });

  describe('getUser', () => {
    it('should return current user', () => {
      const mockUser = { username: 'testuser', role: 'user' };
      store['user'] = JSON.stringify(mockUser);
      
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      const user = newService.getUser();
      
      expect(user).toEqual(mockUser);
    });

    it('should return null if no user', () => {
      const user = service.getUser();
      expect(user).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      store['user'] = JSON.stringify({ username: 'admin', role: 'admin' });
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      
      expect(newService.isAdmin()).toBe(true);
    });

    it('should return true for ADMIN role (uppercase)', () => {
      store['user'] = JSON.stringify({ username: 'admin', role: 'ADMIN' });
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      
      expect(newService.isAdmin()).toBe(true);
    });

    it('should return false for non-admin role', () => {
      store['user'] = JSON.stringify({ username: 'user', role: 'user' });
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      
      expect(newService.isAdmin()).toBe(false);
    });

    it('should return false if no user', () => {
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return stored token', () => {
      store['token'] = 'test-token-123';
      expect(service.getToken()).toBe('test-token-123');
    });

    it('should return null if no token', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('readUserFromStorage', () => {
    it('should parse valid JSON user data', () => {
      const mockUser = { username: 'test', role: 'user' };
      store['user'] = JSON.stringify(mockUser);
      
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      expect(newService.getUser()).toEqual(mockUser);
    });

    it('should return null for invalid JSON', () => {
      store['user'] = 'invalid json {';
      
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      expect(newService.getUser()).toBeNull();
    });

    it('should return null for empty storage', () => {
      const newService = new AuthService(TestBed.inject(HttpClientTestingModule) as any, mockWsService);
      expect(newService.getUser()).toBeNull();
    });
  });

  describe('user$ Observable', () => {
    it('should emit user changes', (done) => {
      const mockResponse: LoginResponse = {
        token: 'token',
        user: { username: 'newuser', role: 'user' }
      };

      const emissions: any[] = [];
      service.user$.subscribe(user => {
        emissions.push(user);
        if (emissions.length === 2) {
          expect(emissions[0]).toBeNull();
          expect(emissions[1]).toEqual(mockResponse.user);
          done();
        }
      });

      service.login('newuser', 'pass').subscribe();
      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      req.flush(mockResponse);
    });

    it('should emit null on logout', (done) => {
      const mockResponse: LoginResponse = {
        token: 'token',
        user: { username: 'user', role: 'user' }
      };

      const emissions: any[] = [];
      service.user$.subscribe(user => {
        emissions.push(user);
        if (emissions.length === 3) {
          expect(emissions[2]).toBeNull();
          done();
        }
      });

      service.login('user', 'pass').subscribe(() => {
        service.logout();
      });

      const req = httpMock.expectOne(`${environment.baseUrl}/login`);
      req.flush(mockResponse);
    });
  });
});
