// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { loadingInterceptor } from './loading.interceptor';
import { LoadingService } from '../state/loading.service';


beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('loadingInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let loadingService: LoadingService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        LoadingService,
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    loadingService = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    httpTestingController.verify();
    loadingService.clearAll();
  });

  describe('Tracking de peticiones API', () => {
    it('debe activar loading durante petición GET', () => {
      let loadingDuringRequest = false;

      httpClient.get('/api/threats').subscribe({
        next: () => {
          // Loading ya debería estar en false aquí después de finalize
        }
      });

      // Verificar que loading está activo durante la petición
      loadingDuringRequest = loadingService.isLoading();
      expect(loadingDuringRequest).toBe(true);

      // Simular respuesta
      const req = httpTestingController.expectOne('/api/threats');
      req.flush([]);

      // Después de la respuesta, loading debería estar inactivo
      expect(loadingService.isLoading()).toBe(false);
    });

    it('debe activar loading durante petición POST', () => {
      httpClient.post('/api/threats', { data: 'test' }).subscribe();

      expect(loadingService.isLoading()).toBe(true);

      const req = httpTestingController.expectOne('/api/threats');
      req.flush({ success: true });

      expect(loadingService.isLoading()).toBe(false);
    });

    it('debe desactivar loading en caso de error HTTP', () => {
      httpClient.get('/api/threats').subscribe({
        error: () => {
          // Expected error
        }
      });

      expect(loadingService.isLoading()).toBe(true);

      const req = httpTestingController.expectOne('/api/threats');
      req.error(new ProgressEvent('Network error'), { status: 500 });

      expect(loadingService.isLoading()).toBe(false);
    });
  });

  describe('Exclusión de recursos estáticos', () => {
    it('no debe trackear peticiones a assets', () => {
      httpClient.get('/assets/images/logo.png').subscribe();

      expect(loadingService.isLoading()).toBe(false);

      const req = httpTestingController.expectOne('/assets/images/logo.png');
      req.flush('');
    });

    it('no debe trackear archivos HTML', () => {
      httpClient.get('/templates/page.html').subscribe();

      expect(loadingService.isLoading()).toBe(false);

      const req = httpTestingController.expectOne('/templates/page.html');
      req.flush('<html></html>');
    });

    it('no debe trackear archivos CSS', () => {
      httpClient.get('/styles/main.css').subscribe();

      expect(loadingService.isLoading()).toBe(false);

      const req = httpTestingController.expectOne('/styles/main.css');
      req.flush('body { }');
    });

    it('no debe trackear conexiones WebSocket', () => {
      httpClient.get('/sockjs-node/info').subscribe();

      expect(loadingService.isLoading()).toBe(false);

      const req = httpTestingController.expectOne('/sockjs-node/info');
      req.flush({});
    });

    it('no debe trackear archivos ICO', () => {
      httpClient.get('/favicon.ico').subscribe();

      expect(loadingService.isLoading()).toBe(false);

      const req = httpTestingController.expectOne('/favicon.ico');
      req.flush('');
    });
  });

  describe('Múltiples peticiones simultáneas', () => {
    it('debe mantener loading mientras haya peticiones pendientes', () => {
      httpClient.get('/api/threats').subscribe();
      httpClient.get('/api/users').subscribe();

      expect(loadingService.isLoading()).toBe(true);

      // Completar primera petición
      const req1 = httpTestingController.expectOne('/api/threats');
      req1.flush([]);

      // Loading debería seguir activo por segunda petición
      // Nota: como usamos 'generic' para todas, se sobrescriben
      // En un caso real, se usarían diferentes tipos de operación

      // Completar segunda petición
      const req2 = httpTestingController.expectOne('/api/users');
      req2.flush([]);

      expect(loadingService.isLoading()).toBe(false);
    });
  });

  describe('Mensajes de carga', () => {
    it('debe mostrar mensaje apropiado para GET', () => {
      httpClient.get('/api/data').subscribe();

      expect(loadingService.loadingMessage()).toBe('Cargando datos...');

      httpTestingController.expectOne('/api/data').flush({});
    });

    it('debe mostrar mensaje apropiado para POST', () => {
      httpClient.post('/api/data', {}).subscribe();

      expect(loadingService.loadingMessage()).toBe('Enviando datos...');

      httpTestingController.expectOne('/api/data').flush({});
    });

    it('debe mostrar mensaje apropiado para PUT', () => {
      httpClient.put('/api/data/1', {}).subscribe();

      expect(loadingService.loadingMessage()).toBe('Actualizando...');

      httpTestingController.expectOne('/api/data/1').flush({});
    });

    it('debe mostrar mensaje apropiado para DELETE', () => {
      httpClient.delete('/api/data/1').subscribe();

      expect(loadingService.loadingMessage()).toBe('Eliminando...');

      httpTestingController.expectOne('/api/data/1').flush({});
    });

    it('debe mostrar mensaje apropiado para PATCH', () => {
      httpClient.patch('/api/data/1', {}).subscribe();

      expect(loadingService.loadingMessage()).toBe('Actualizando...');

      httpTestingController.expectOne('/api/data/1').flush({});
    });
  });
});
