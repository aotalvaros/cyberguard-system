import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { errorInterceptor } from '../error.interceptor';
import { LocalStorageAdapter } from '../../adapters/local-storage.adapter';
import { AppErrorType } from '../../handlers/global-error.handler';
import { firstValueFrom } from 'rxjs';

describe('ErrorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let mockStorage: { remove: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRouter = {
      navigate: vi.fn()
    };
    mockStorage = {
      remove: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: mockRouter },
        { provide: LocalStorageAdapter, useValue: mockStorage }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should transform 401 error and redirect to login', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/threats');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.AUTHENTICATION);
      expect(error.statusCode).toBe(401);
      expect(mockStorage.remove).toHaveBeenCalledWith('token');
      expect(mockStorage.remove).toHaveBeenCalledWith('user');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
    }
  });

  it('should transform 403 error to AUTHORIZATION type', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/admin');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/admin');
    req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.AUTHORIZATION);
      expect(error.statusCode).toBe(403);
    }
  });

  it('should transform 400 error to VALIDATION type', async () => {
    const request$ = httpClient.post('http://localhost:3000/api/threats', {});
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    req.flush({ message: 'Invalid input' }, { status: 400, statusText: 'Bad Request' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.VALIDATION);
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('Invalid');
    }
  });

  it('should transform 500 error to SERVER type', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/threats');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    req.flush({ error: 'Internal error' }, { status: 500, statusText: 'Internal Server Error' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.SERVER);
      expect(error.statusCode).toBe(500);
    }
  });

  it('should transform network error (status 0) to NETWORK type', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/threats');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.NETWORK);
      expect(error.statusCode).toBe(0);
    }
  });

  it('should transform 404 error to SERVER type with resource not found message', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/threats/invalid-id');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats/invalid-id');
    req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.SERVER);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('not found');
    }
  });

  it('should transform 502 error to SERVER type', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/threats');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    req.flush({}, { status: 502, statusText: 'Bad Gateway' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.SERVER);
      expect(error.statusCode).toBe(502);
    }
  });

  it('should transform 503 error to SERVER type', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/threats');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    req.flush({}, { status: 503, statusText: 'Service Unavailable' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.SERVER);
      expect(error.statusCode).toBe(503);
    }
  });

  it('should transform 504 error to SERVER type', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/threats');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    req.flush({}, { status: 504, statusText: 'Gateway Timeout' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.SERVER);
      expect(error.statusCode).toBe(504);
    }
  });

  it('should transform unknown status to UNKNOWN type', async () => {
    const request$ = httpClient.get('http://localhost:3000/api/threats');
    const promise = firstValueFrom(request$);

    const req = httpMock.expectOne('http://localhost:3000/api/threats');
    req.flush({}, { status: 418, statusText: 'I\'m a teapot' });

    try {
      await promise;
    } catch (error: any) {
      expect(error.type).toBe(AppErrorType.UNKNOWN);
      expect(error.statusCode).toBe(418);
    }
  });
});
