// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from '../auth.interceptor';
import { LocalStorageAdapter } from '../../adapters/local-storage.adapter';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});


describe('AuthInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockStorage: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockStorage = {
      get: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: LocalStorageAdapter, useValue: mockStorage }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header when token exists', () => {
    mockStorage.get.mockReturnValue('test-token-123');

    httpClient.get('http://localhost:3000/api/threats').subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token-123');
    req.flush({});
  });

  it('should NOT add Authorization header when no token', () => {
    mockStorage.get.mockReturnValue(null);

    httpClient.get('http://localhost:3000/api/threats').subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should NOT add Authorization header to login endpoint', () => {
    mockStorage.get.mockReturnValue('test-token-123');

    httpClient.post('http://localhost:3000/api/auth/login', {}).subscribe();

    const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should NOT intercept external URLs', () => {
    mockStorage.get.mockReturnValue('test-token-123');

    httpClient.get('https://external-api.com/data').subscribe();

    const req = httpMock.expectOne('https://external-api.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
