// Tipo de prueba: Unitario
import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { LoadingService, LoadingOperation } from './loading.service';

beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});


describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [LoadingService]
    });
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    service.clearAll();
  });

  describe('Estado inicial', () => {
    it('debe iniciar sin operaciones activas', () => {
      expect(service.isLoading()).toBe(false);
      expect(service.operationsCount()).toBe(0);
      expect(service.activeOperationsList()).toHaveLength(0);
    });

    it('loadingMessage debe ser undefined inicialmente', () => {
      expect(service.loadingMessage()).toBeUndefined();
    });
  });

  describe('startLoading', () => {
    it('debe activar el estado de carga', () => {
      service.startLoading('login');
      
      expect(service.isLoading()).toBe(true);
      expect(service.operationsCount()).toBe(1);
    });

    it('debe guardar el mensaje de la operación', () => {
      const message = 'Iniciando sesión...';
      service.startLoading('login', message);
      
      expect(service.loadingMessage()).toBe(message);
    });

    it('debe registrar la fecha de inicio', () => {
      const before = new Date();
      service.startLoading('fetchThreats');
      const after = new Date();
      
      const operations = service.activeOperationsList();
      expect(operations[0].startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(operations[0].startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('debe permitir múltiples operaciones simultáneas', () => {
      service.startLoading('login', 'Login...');
      service.startLoading('fetchThreats', 'Fetching...');
      
      expect(service.operationsCount()).toBe(2);
      expect(service.isLoading()).toBe(true);
    });

    it('debe reemplazar operación duplicada', () => {
      service.startLoading('login', 'Mensaje 1');
      service.startLoading('login', 'Mensaje 2');
      
      expect(service.operationsCount()).toBe(1);
      expect(service.loadingMessage()).toBe('Mensaje 2');
    });
  });

  describe('stopLoading', () => {
    it('debe desactivar el estado de carga', () => {
      service.startLoading('login');
      service.stopLoading('login');
      
      expect(service.isLoading()).toBe(false);
      expect(service.operationsCount()).toBe(0);
    });

    it('debe mantener otras operaciones activas', () => {
      service.startLoading('login');
      service.startLoading('fetchThreats');
      service.stopLoading('login');
      
      expect(service.isLoading()).toBe(true);
      expect(service.operationsCount()).toBe(1);
      expect(service.isOperationLoading('fetchThreats')).toBe(true);
    });

    it('no debe fallar al detener operación inexistente', () => {
      expect(() => service.stopLoading('login')).not.toThrow();
    });
  });

  describe('isOperationLoading', () => {
    it('debe retornar true para operación activa', () => {
      service.startLoading('reportThreat');
      
      expect(service.isOperationLoading('reportThreat')).toBe(true);
    });

    it('debe retornar false para operación inactiva', () => {
      expect(service.isOperationLoading('websocket')).toBe(false);
    });

    it('debe retornar false después de detener operación', () => {
      service.startLoading('logout');
      service.stopLoading('logout');
      
      expect(service.isOperationLoading('logout')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('debe limpiar todas las operaciones', () => {
      service.startLoading('login');
      service.startLoading('fetchThreats');
      service.startLoading('websocket');
      
      service.clearAll();
      
      expect(service.isLoading()).toBe(false);
      expect(service.operationsCount()).toBe(0);
    });
  });

  describe('withLoading', () => {
    it('debe activar loading durante la ejecución', async () => {
      let wasLoading = false;
      
      await service.withLoading('generic', 'Test...', async () => {
        wasLoading = service.isLoading();
        return 'result';
      });
      
      expect(wasLoading).toBe(true);
      expect(service.isLoading()).toBe(false);
    });

    it('debe retornar el resultado de la función', async () => {
      const result = await service.withLoading('login', 'Login...', async () => {
        return { success: true };
      });
      
      expect(result).toEqual({ success: true });
    });

    it('debe desactivar loading incluso si hay error', async () => {
      try {
        await service.withLoading('reportThreat', 'Report...', async () => {
          throw new Error('Test error');
        });
      } catch {
        // Esperado
      }
      
      expect(service.isLoading()).toBe(false);
    });

    it('debe propagar errores correctamente', async () => {
      const error = new Error('Test error');
      
      await expect(
        service.withLoading('generic', 'Test...', async () => {
          throw error;
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('activeOperationsList', () => {
    it('debe retornar lista de operaciones activas', () => {
      service.startLoading('login', 'Login...');
      service.startLoading('fetchThreats', 'Fetching...');
      
      const list = service.activeOperationsList();
      
      expect(list).toHaveLength(2);
      expect(list.map(op => op.operation)).toContain('login');
      expect(list.map(op => op.operation)).toContain('fetchThreats');
    });

    it('debe incluir todos los datos de cada operación', () => {
      service.startLoading('websocket', 'Connecting...');
      
      const [operation] = service.activeOperationsList();
      
      expect(operation.operation).toBe('websocket');
      expect(operation.message).toBe('Connecting...');
      expect(operation.startedAt).toBeInstanceOf(Date);
    });
  });
});
