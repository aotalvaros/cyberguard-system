import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  
  const API_BASE = 'http://localhost:3000/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        user: { username: 'admin', role: 'admin' }
      };
      const credentials = { username: 'admin', password: 'cyberguard2024' };

      service.login(credentials.username, credentials.password).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.getItem('token')).toBe(mockResponse.token);
        expect(localStorage.getItem('currentUser')).toBe(JSON.stringify(mockResponse.user));
      });

      const req = httpMock.expectOne(`${API_BASE}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      req.flush(mockResponse);
    });

    it('should handle login error with invalid credentials', () => {
      const mockError = { error: 'Invalid credentials' };
      const credentials = { username: 'admin', password: 'wrongpass' };

      service.login(credentials.username, credentials.password).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.error).toEqual(mockError);
          expect(localStorage.getItem('token')).toBeNull();
          expect(localStorage.getItem('currentUser')).toBeNull();
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/auth/login`);
      req.flush(mockError, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle network error gracefully', () => {
      const credentials = { username: 'admin', password: 'cyberguard2024' };

      service.login(credentials.username, credentials.password).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error.status).toBe(0);
          expect(localStorage.getItem('token')).toBeNull();
        }
      });

      const req = httpMock.expectOne(`${API_BASE}/auth/login`);
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('logout', () => {
    it('should clear localStorage on logout', () => {
      // Setup initial state
      localStorage.setItem('token', 'test.token'); 
      localStorage.setItem('currentUser', JSON.stringify({ username: 'admin' }));

      service.logout();

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('currentUser')).toBeNull();
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      const testToken = 'test.jwt.token';
      localStorage.setItem('token', testToken);

      expect(service.getToken()).toBe(testToken);
    });

    it('should return null if no token exists', () => {
      expect(service.getToken()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should return parsed user from localStorage', () => {
      const testUser = { username: 'admin', role: 'admin' };
      localStorage.setItem('currentUser', JSON.stringify(testUser));

      expect(service.getCurrentUser()).toEqual(testUser);
    });

    it('should return null if no user exists', () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it('should handle malformed JSON gracefully', () => {
      localStorage.setItem('currentUser', 'invalid-json');

      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if token exists', () => {
      localStorage.setItem('token', 'test.token');

      expect(service.isAuthenticated()).toBe(true);
    });

    it('should return false if no token', () => {
      expect(service.isAuthenticated()).toBe(false);
    });
  });
});