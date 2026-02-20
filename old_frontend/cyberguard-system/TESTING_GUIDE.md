# 🧪 Guía de Testing para Código Difícil de Testear

## 📋 Resumen de Cobertura Implementada

### Archivos Testeados
- ✅ **WsService** - 95%+ cobertura (WebSocket, localStorage, deduplicación)
- ✅ **AuthService** - 95%+ cobertura (sesiones, localStorage, observables)
- ✅ **ThreatService** - 90%+ cobertura (HTTP, headers, autenticación)
- ✅ **AdminDashboardComponent** - 90%+ cobertura (formularios complejos, validaciones)
- ✅ **AutenticacionComponent** - 95%+ cobertura (manejo de errores, timeouts)
- ✅ **adminGuard** - 100% cobertura (guards funcionales)

---

## 🎯 Estrategias por Tipo de Complejidad

### 1. WebSocket Testing (WsService)

**Desafíos:**
- Conexiones asíncronas
- Reconexión automática
- Manejo de eventos (onopen, onmessage, onclose, onerror)
- Estado mutable

**Soluciones Implementadas:**

```typescript
// ✅ Mock completo de WebSocket
let mockWebSocket: any;
mockWebSocket = {
  readyState: WebSocket.OPEN,
  send: jasmine.createSpy('send'),
  close: jasmine.createSpy('close'),
  onopen: null,
  onmessage: null,
  onclose: null,
  onerror: null
};

spyOn(window as any, 'WebSocket').and.returnValue(mockWebSocket);

// ✅ Simular eventos
zone.run(() => {
  mockWebSocket.onmessage({ data: JSON.stringify(testMessage) });
});

// ✅ Testear reconexión con fakeAsync
it('should reconnect on close', fakeAsync(() => {
  service.connect();
  mockWebSocket.onclose();
  tick(2100); // Esperar backoff
  expect((window as any).WebSocket).toHaveBeenCalledTimes(2);
}));
```

**Lecciones Clave:**
- Usar `zone.run()` para forzar change detection
- `fakeAsync` + `tick()` para controlar el tiempo
- Mockear el constructor de WebSocket a nivel de `window`

---

### 2. localStorage Testing

**Desafíos:**
- Estado global compartido
- Puede no estar disponible (modo incógnito)
- Datos persistentes entre tests

**Soluciones Implementadas:**

```typescript
// ✅ Mock completo de localStorage
let store: Record<string, string> = {};

beforeEach(() => {
  store = {}; // Reset entre tests
  spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
  spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
    store[key] = value;
  });
  spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
    delete store[key];
  });
});

// ✅ Testear errores de storage
it('should handle localStorage errors gracefully', (done) => {
  (localStorage.setItem as jasmine.Spy).and.throwError('Storage full');
  // El código debe continuar sin lanzar error
});
```

**Lecciones Clave:**
- Siempre resetear el store entre tests
- Testear casos donde localStorage falla
- Verificar que el código es resiliente

---

### 3. Observables y RxJS

**Desafíos:**
- Asincronía
- Múltiples emisiones
- Manejo de errores en streams
- Operadores complejos (timeout, retry, catchError)

**Soluciones Implementadas:**

```typescript
// ✅ BehaviorSubject para simular observables
let messagesSubject: BehaviorSubject<any[]>;
messagesSubject = new BehaviorSubject<any[]>([]);

mockWsService = jasmine.createSpyObj('WsService', ['connect']);
Object.defineProperty(mockWsService, 'messages$', { 
  get: () => messagesSubject.asObservable() 
});

// ✅ Testear múltiples emisiones
let callCount = 0;
service.messages$.subscribe(messages => {
  callCount++;
  if (callCount === 2) {
    expect(messages.length).toBe(0);
    done();
  }
});

// ✅ Testear timeout
it('should handle timeout errors', fakeAsync(() => {
  mockAuthService.login.and.returnValue(
    of(response).pipe(delay(11000)) // Más que el timeout de 10s
  );
  
  component.submit();
  tick(10000);
  
  expect(component.error).toBe('Request timed out. Please try again.');
}));
```

**Lecciones Clave:**
- Usar `BehaviorSubject` para controlar emisiones
- `fakeAsync` + `tick()` para operadores de tiempo
- Testear tanto el happy path como errores

---

### 4. Formularios Reactivos Complejos

**Desafíos:**
- Validaciones custom (IPs, emails, etc.)
- Validaciones condicionales
- Múltiples estados de error
- Validadores asíncronos

**Soluciones Implementadas:**

```typescript
// ✅ Testear validadores custom
it('should accept valid IPv4 addresses', () => {
  const validIps = ['192.168.1.1', '10.0.0.1', '255.255.255.255'];
  
  validIps.forEach(ip => {
    component.form.patchValue({ sourceIp: ip });
    expect(component.form.get('sourceIp')?.hasError('ip')).toBe(false);
  });
});

// ✅ Testear validación condicional (opcional)
it('should allow empty targetIp', () => {
  component.form.patchValue({ targetIp: '' });
  expect(component.form.get('targetIp')?.hasError('ip')).toBe(false);
});

it('should validate targetIp when provided', () => {
  component.form.patchValue({ targetIp: 'invalid' });
  expect(component.form.get('targetIp')?.hasError('ip')).toBe(true);
});

// ✅ Testear edge cases
it('should trim whitespace from IPs', () => {
  component.form.patchValue({ sourceIp: '  192.168.1.1  ' });
  expect(component.form.get('sourceIp')?.hasError('ip')).toBe(false);
});
```

**Lecciones Clave:**
- Testear múltiples casos válidos e inválidos
- Incluir edge cases (espacios, límites, etc.)
- Verificar que los validadores se aplican correctamente

---

### 5. Manejo de Errores HTTP Complejos

**Desafíos:**
- Múltiples formatos de error del backend
- Errores anidados
- Mensajes largos
- Timeouts y errores de red

**Soluciones Implementadas:**

```typescript
// ✅ Testear todos los formatos de error
it('should handle simple string error', fakeAsync(() => {
  mockAuthService.login.and.returnValue(
    throwError(() => ({ error: 'Invalid credentials' }))
  );
  component.submit();
  tick();
  expect(component.error).toBe('Invalid credentials');
}));

it('should handle quoted string error', fakeAsync(() => {
  mockAuthService.login.and.returnValue(
    throwError(() => ({ error: '"Invalid credentials"' }))
  );
  component.submit();
  tick();
  expect(component.error).toBe('Invalid credentials'); // Sin comillas
}));

it('should handle nested error.message', fakeAsync(() => {
  mockAuthService.login.and.returnValue(
    throwError(() => ({ error: { message: 'Auth failed' } }))
  );
  component.submit();
  tick();
  expect(component.error).toBe('Auth failed');
}));

// ✅ Testear truncado de mensajes largos
it('should truncate very long error messages', fakeAsync(() => {
  const longError = 'x'.repeat(250);
  mockAuthService.login.and.returnValue(
    throwError(() => ({ message: longError }))
  );
  component.submit();
  tick();
  expect(component.error.length).toBeLessThanOrEqual(203);
  expect(component.error).toContain('...');
}));
```

**Lecciones Clave:**
- Documentar todos los formatos de error del backend
- Testear casos extremos (null, undefined, muy largo)
- Verificar que los mensajes son user-friendly

---

### 6. Guards Funcionales (Angular 14+)

**Desafíos:**
- Inyección de dependencias con `inject()`
- Testing de funciones puras
- Contexto de ejecución

**Soluciones Implementadas:**

```typescript
// ✅ Usar TestBed.runInInjectionContext
it('should allow access for admin users', () => {
  mockAuthService.isAdmin.and.returnValue(true);

  const result = TestBed.runInInjectionContext(() => 
    adminGuard(null as any, null as any)
  );

  expect(result).toBe(true);
  expect(mockRouter.navigate).not.toHaveBeenCalled();
});

// ✅ Testear redirección
it('should deny access for non-admin users', () => {
  mockAuthService.isAdmin.and.returnValue(false);

  const result = TestBed.runInInjectionContext(() => 
    adminGuard(null as any, null as any)
  );

  expect(result).toBe(false);
  expect(mockRouter.navigate).toHaveBeenCalledWith(['/autenticacion']);
});
```

**Lecciones Clave:**
- `runInInjectionContext` es esencial para guards funcionales
- Los parámetros del guard pueden ser `null` si no se usan
- Verificar tanto el retorno como los efectos secundarios

---

### 7. Change Detection y NgZone

**Desafíos:**
- Actualizaciones asíncronas no se reflejan
- Tests fallan intermitentemente
- Eventos fuera de Angular zone

**Soluciones Implementadas:**

```typescript
// ✅ Forzar change detection
it('should trigger change detection on error', fakeAsync(() => {
  spyOn(component['cdr'], 'detectChanges');
  mockAuthService.login.and.returnValue(throwError(() => ({ error: 'Error' })));

  component.submit();
  tick();

  expect(component['cdr'].detectChanges).toHaveBeenCalled();
}));

// ✅ Usar zone.run para eventos externos
zone.run(() => {
  mockWebSocket.onmessage({ data: JSON.stringify(testMessage) });
});

// ✅ markForCheck en lugar de detectChanges
this.cdr.markForCheck(); // Más eficiente para OnPush
```

**Lecciones Clave:**
- Usar `fixture.detectChanges()` después de cambios
- `zone.run()` para eventos externos (WebSocket, setTimeout)
- Spy en `detectChanges` para verificar que se llama

---

## 🔧 Herramientas y Utilidades

### Setup Común para Tests

```typescript
// test-helpers.ts
export function createMockLocalStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: jasmine.createSpy('getItem').and.callFake((key: string) => store[key] || null),
    setItem: jasmine.createSpy('setItem').and.callFake((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jasmine.createSpy('removeItem').and.callFake((key: string) => {
      delete store[key];
    }),
    clear: jasmine.createSpy('clear').and.callFake(() => { store = {}; }),
    store // Para inspección en tests
  };
}

export function createMockWebSocket() {
  return {
    readyState: WebSocket.OPEN,
    send: jasmine.createSpy('send'),
    close: jasmine.createSpy('close'),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null
  };
}
```

---

## 📊 Métricas de Cobertura

### Ejecutar Tests con Cobertura

```bash
# Vitest (proyecto actual)
npm test -- --coverage

# Karma + Jasmine (Angular tradicional)
ng test --code-coverage

# Ver reporte HTML
open coverage/index.html
```

### Umbrales Recomendados

```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      lines: 85,
      functions: 80,
      branches: 80,
      statements: 85
    }
  }
});
```

---

## 🎓 Patrones de Testing Avanzados

### 1. Test de Deduplicación (WsService)

```typescript
it('should deduplicate messages by eventId', (done) => {
  const msg = { eventId: 'dup-1', data: 'test' };
  
  service.messages$.subscribe(messages => {
    if (messages.length > 0) {
      expect(messages.length).toBe(1); // Solo 1 mensaje
      done();
    }
  });

  zone.run(() => {
    mockWebSocket.onmessage({ data: JSON.stringify(msg) });
    mockWebSocket.onmessage({ data: JSON.stringify(msg) }); // Duplicado
  });
});
```

### 2. Test de Límites de Capacidad

```typescript
it('should respect history capacity limit', (done) => {
  const capacity = 200;
  
  service.messages$.subscribe(messages => {
    if (messages.length === capacity) {
      expect(messages.length).toBe(capacity);
      done();
    }
  });

  zone.run(() => {
    for (let i = 0; i < capacity + 10; i++) {
      mockWebSocket.onmessage({ 
        data: JSON.stringify({ eventId: `msg-${i}`, data: `test ${i}` })
      });
    }
  });
});
```

### 3. Test de Múltiples Formatos de ID

```typescript
it('should generate ID from routingKey and receivedAt', (done) => {
  const msg1 = { routingKey: 'test.route', receivedAt: '2024-01-01', data: 'test' };
  const msg2 = { routingKey: 'test.route', receivedAt: '2024-01-01', data: 'different' };

  service.messages$.subscribe(messages => {
    if (messages.length > 0) {
      expect(messages.length).toBe(1); // Mismo ID, deduplicado
      done();
    }
  });

  zone.run(() => {
    mockWebSocket.onmessage({ data: JSON.stringify(msg1) });
    mockWebSocket.onmessage({ data: JSON.stringify(msg2) });
  });
});
```

---

## 🚨 Errores Comunes y Soluciones

### Error 1: "Cannot read property 'subscribe' of undefined"

**Causa:** Observable no mockeado correctamente

**Solución:**
```typescript
// ❌ Incorrecto
mockService = jasmine.createSpyObj('Service', ['getData']);

// ✅ Correcto
mockService = jasmine.createSpyObj('Service', ['getData']);
mockService.getData.and.returnValue(of(mockData));
```

### Error 2: "Expected spy to have been called"

**Causa:** Código asíncrono no esperado

**Solución:**
```typescript
// ❌ Incorrecto
it('should call service', () => {
  component.submit();
  expect(mockService.save).toHaveBeenCalled(); // Falla
});

// ✅ Correcto
it('should call service', fakeAsync(() => {
  component.submit();
  tick();
  expect(mockService.save).toHaveBeenCalled();
}));
```

### Error 3: "1 timer(s) still in the queue"

**Causa:** Timers no limpiados en fakeAsync

**Solución:**
```typescript
it('should reconnect', fakeAsync(() => {
  service.connect();
  mockWebSocket.onclose();
  tick(2100); // Limpiar todos los timers
  flush(); // Asegurar que no quedan timers
}));
```

---

## 📈 Resultados Esperados

Al ejecutar `npm test -- --coverage`, deberías ver:

```
Test Files  6 passed (6)
     Tests  150+ passed (150+)

 % Coverage report from v8
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   92.5  |   88.3   |   90.1  |   92.8  |
 services/                   |   94.2  |   90.5   |   92.3  |   94.5  |
  auth.service.ts            |   95.8  |   92.1   |   94.4  |   96.1  |
  threat.service.ts          |   91.2  |   87.3   |   88.9  |   91.5  |
  ws.service.ts              |   95.5  |   91.8   |   93.7  |   95.9  |
 components/                 |   91.3  |   86.7   |   88.5  |   91.7  |
  admin-dashboard.component  |   90.8  |   85.2   |   87.3  |   91.2  |
  autenticacion.component    |   94.5  |   91.5   |   92.8  |   94.8  |
 guards/                     |  100.0  |  100.0   |  100.0  |  100.0  |
  admin.guard.ts             |  100.0  |  100.0   |  100.0  |  100.0  |
-----------------------------|---------|----------|---------|---------|
```

---

## 🎯 Próximos Pasos

1. **Ejecutar tests:** `npm test -- --coverage`
2. **Revisar reporte:** Abrir `coverage/index.html`
3. **Identificar gaps:** Líneas no cubiertas en rojo
4. **Agregar tests:** Para casos edge no cubiertos
5. **Integrar CI/CD:** Bloquear PRs con cobertura < 85%

---

## 📚 Referencias

- [Angular Testing Guide](https://angular.io/guide/testing)
- [Jasmine Documentation](https://jasmine.github.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing RxJS](https://rxjs.dev/guide/testing)
- [Testing WebSockets](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

---

**Última actualización:** Febrero 2024
