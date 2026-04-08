import { describe, it, expect, afterEach, beforeEach} from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { retryInterceptor } from '../retry.interceptor';


describe('retryInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([retryInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock   = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should NOT retry 500 errors — propagates on first attempt', () => {
    let errorReceived: unknown;

    httpClient.get('/api/incidents').subscribe({ error: (e) => { errorReceived = e; } });

    const req = httpMock.expectOne('/api/incidents');
    req.flush({ error: 'DB error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(errorReceived).toBeDefined();
  });

  it('should NOT retry 503 errors — propagates on first attempt', () => {
    let errorReceived: unknown;

    httpClient.get('/api/users').subscribe({ error: (e) => { errorReceived = e; } });

    const req = httpMock.expectOne('/api/users');
    req.flush({ error: 'Service Unavailable' }, { status: 503, statusText: 'Service Unavailable' });

    expect(errorReceived).toBeDefined();
  });

  it('should NOT retry 400 errors — propagates on first attempt', () => {
    let errorReceived: unknown;

    httpClient.post('/api/incidents', {}).subscribe({ error: (e) => { errorReceived = e; } });

    const req = httpMock.expectOne('/api/incidents');
    req.flush({ error: 'Invalid input' }, { status: 400, statusText: 'Bad Request' });

    expect(errorReceived).toBeDefined();
  });

  it('should NOT retry 401 errors — propagates on first attempt', () => {
    let errorReceived: unknown;

    httpClient.get('/api/users').subscribe({ error: (e) => { errorReceived = e; } });

    const req = httpMock.expectOne('/api/users');
    req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBeDefined();
  });

  it('should NOT retry 403 errors — propagates on first attempt', () => {
    let errorReceived: unknown;

    httpClient.get('/api/admin/users').subscribe({ error: (e) => { errorReceived = e; } });

    const req = httpMock.expectOne('/api/admin/users');
    req.flush({ error: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(errorReceived).toBeDefined();
  });

  it('should NOT retry 404 errors — propagates on first attempt', () => {
    let errorReceived: unknown;

    httpClient.get('/api/incidents/nonexistent').subscribe({ error: (e) => { errorReceived = e; } });

    const req = httpMock.expectOne('/api/incidents/nonexistent');
    req.flush({ error: 'Not Found' }, { status: 404, statusText: 'Not Found' });

    expect(errorReceived).toBeDefined();
  });

  it('should return success response when request succeeds', () => {
    let result: unknown;

    httpClient.get('/api/incidents').subscribe({ next: (r) => { result = r; } });

    const req = httpMock.expectOne('/api/incidents');
    req.flush({ incidents: [], total: 0 });

    expect(result).toEqual({ incidents: [], total: 0 });
  });
});
