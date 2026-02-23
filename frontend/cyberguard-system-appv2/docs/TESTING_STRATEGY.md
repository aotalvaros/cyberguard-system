# Estrategia de Testing - CyberGuard System Frontend

## Resumen Ejecutivo

Este documento define la estrategia de Quality Assurance (QA) para el frontend de CyberGuard System, diferenciando claramente entre **verificación** (¿estamos construyendo el producto correctamente?) y **validación** (¿estamos construyendo el producto correcto?).

## Métricas de Cobertura Alcanzadas

| Métrica | Valor | Objetivo |
|---------|-------|----------|
| Statements | 93.88% | ≥80% ✅ |
| Branches | 91.81% | ≥70% ✅ |
| Functions | 91.83% | ≥80% ✅ |
| Lines | 97.68% | ≥80% ✅ |
| Tests Passing | 321/321 | 100% ✅ |

## Arquitectura de Testing

```
┌─────────────────────────────────────────────────────────────┐
│                    TESTS POR CAPA                           │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer    │  Component Tests, Integration      │
│  (components, guards)  │  Tests con TestBed                 │
├────────────────────────┼────────────────────────────────────┤
│  Application Layer     │  Use Case Tests (unitarios)        │
│  (use-cases)           │                                    │
├────────────────────────┼────────────────────────────────────┤
│  Domain Layer          │  Domain Service Tests, Model       │
│  (models, services,    │  Tests, Port Contract Tests        │
│   ports)               │                                    │
├────────────────────────┼────────────────────────────────────┤
│  Infrastructure Layer  │  Repository Implementation Tests,  │
│  (services, mappers,   │  Interceptor Tests, Mapper Tests   │
│   interceptors)        │                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. VERIFICACIÓN (¿Lo construimos correctamente?)

La verificación se enfoca en confirmar que el código cumple con las especificaciones técnicas y funciona según lo diseñado.

### 1.1 Tests Unitarios

**Propósito**: Verificar que cada unidad de código funciona correctamente de forma aislada.

| Capa | Archivos Testeados | Cobertura |
|------|-------------------|-----------|
| Domain Models | `threat-statistics.model.ts`, `severity.enum.ts` | 100% |
| Domain Services | `alerts-domain.service.ts`, `threat-domain.service.ts` | 100% |
| Domain Ports | `statistics.repository.ts`, `websocket.repository.ts` | 100% |
| Application Use Cases | Todos los use cases | 100% |
| Infrastructure Mappers | `threat.mapper.ts`, `websocket.mapper.ts`, `auth.mapper.ts` | 100% |

**Ejemplo de Test de Verificación (Domain Model)**:
```typescript
// Verifica que EMPTY_STATISTICS tiene la estructura correcta
describe('EMPTY_STATISTICS', () => {
  it('should have all required fields with zero/empty values', () => {
    expect(EMPTY_STATISTICS.totalThreats).toBe(0);
    expect(EMPTY_STATISTICS.byType).toEqual({});
    expect(EMPTY_STATISTICS.bySeverity).toEqual({});
  });
});
```

### 1.2 Tests de Integración

**Propósito**: Verificar que los componentes interactúan correctamente entre sí.

| Componente | Integraciones Verificadas |
|------------|--------------------------|
| `StatisticsWidget` | Use Case → Repository → Component |
| `AlertsComponent` | WebSocket → Domain Service → Component |
| `DashboardComponent` | Multiple widgets rendering |
| Interceptors | HTTP pipeline integration |

**Ejemplo de Test de Integración**:
```typescript
// Verifica integración entre Repository y HTTP Client
it('should unwrap API envelope and return only data field', async () => {
  const responsePromise = firstValueFrom(repo.getStatistics());
  const req = httpMock.expectOne(EXPECTED_URL);
  req.flush({ success: true, data: mockStats });
  
  const result = await responsePromise;
  expect(result).toEqual(mockStats);
});
```

### 1.3 Tests de Contratos (Ports)

**Propósito**: Verificar que las implementaciones cumplen con los contratos definidos en los puertos.

```typescript
// Verifica que la clase abstracta funciona como token DI
it('should be usable as an Angular DI token', () => {
  TestBed.configureTestingModule({
    providers: [{ provide: StatisticsRepository, useClass: StubStatisticsRepository }]
  });
  const repo = TestBed.inject(StatisticsRepository);
  expect(repo).toBeInstanceOf(StubStatisticsRepository);
});
```

---

## 2. VALIDACIÓN (¿Construimos el producto correcto?)

La validación se enfoca en confirmar que el sistema satisface las necesidades del usuario y los requisitos de negocio.

### 2.1 Tests de Comportamiento (BDD-style)

**Propósito**: Validar que el sistema se comporta según las expectativas del usuario.

**Formato**: Given-When-Then documentado en comentarios

```typescript
// Given: HttpClientTestingModule and backend returns { success: true, data: mockStats }
// When: getStatistics() is called and the HTTP request is flushed
// Then: the observable emits only the `data` portion as ThreatStatistics
// And: the `success` field does NOT appear in the emitted value
it('should unwrap the API envelope and return only the data field', async () => {
  // ... test implementation
});
```

### 2.2 Tests de Componentes UI

**Propósito**: Validar que la interfaz de usuario presenta la información correctamente.

| Componente | Validaciones |
|------------|--------------|
| `StatisticsWidget` | Muestra contador de amenazas totales |
| `StatisticsWidget` | Muestra amenazas críticas activas |
| `StatisticsWidget` | Muestra amenazas últimas 24h |
| `AlertsComponent` | Lista de alertas en tiempo real |
| `DashboardComponent` | Renderiza todos los widgets |

**Ejemplo de Test de Validación UI**:
```typescript
// Valida que el usuario puede ver las estadísticas de amenazas
it('should display total threats count', () => {
  const compiled = fixture.nativeElement;
  expect(compiled.textContent).toContain('15'); // Total threats
});

it('should display critical threats prominently', () => {
  const criticalElement = fixture.nativeElement.querySelector('.critical-count');
  expect(criticalElement.textContent).toContain('3');
});
```

### 2.3 Tests de Flujos de Usuario

**Propósito**: Validar flujos completos desde la perspectiva del usuario.

| Flujo | Validaciones |
|-------|--------------|
| Autenticación | Login → Token almacenado → Redirección a dashboard |
| Ver Alertas | Conexión WS → Recibir mensaje → Mostrar en lista |
| Ver Estadísticas | Cargar dashboard → Fetch API → Mostrar widget |
| Manejo de Errores | Error de red → Mostrar estado vacío gracefully |

---

## 3. Tipos de Tests Implementados

### 3.1 Pirámide de Testing

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲        (Pendiente - requiere backend)
                 ╱──────╲
                ╱        ╲
               ╱Integration╲    30% de tests
              ╱────────────╲
             ╱              ╲
            ╱   Unit Tests   ╲  70% de tests
           ╱──────────────────╲
```

### 3.2 Distribución de Tests por Tipo

| Tipo | Cantidad | Propósito |
|------|----------|-----------|
| Unit Tests | ~225 | Verificación de lógica aislada |
| Integration Tests | ~80 | Verificación de interacciones |
| Component Tests | ~16 | Validación de UI |
| Contract Tests | ~4 | Verificación de interfaces |

---

## 4. Framework y Herramientas

| Herramienta | Uso |
|-------------|-----|
| **Vitest** | Test runner principal |
| **@angular/core/testing** | Testing utilities para Angular |
| **HttpClientTestingModule** | Mock de HTTP requests |
| **v8** | Coverage provider |
| **istanbul** | Generación de reportes HTML |

### 4.1 Configuración de Cobertura

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov', 'json'],
  reportsDirectory: './coverage/cyberguard-system-app',
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 70,
    statements: 80,
  },
}
```

---

## 5. Estrategia de Mocking

### 5.1 Mocks por Capa

| Capa | Estrategia de Mock |
|------|-------------------|
| HTTP | `HttpClientTestingModule` con `HttpTestingController` |
| WebSocket | Mock class con simulación de eventos |
| Storage | `StorageAdapter` interface con mock implementation |
| Repositories | Stubs que implementan puertos abstractos |

### 5.2 Ejemplo de Mock Testable

```typescript
// WebSocket mockeable para tests
export type WebSocketFactory = (url: string) => WebSocket;

class MockWebSocket {
  simulateOpen(): void { /* ... */ }
  simulateMessage(data: unknown): void { /* ... */ }
  simulateClose(): void { /* ... */ }
}
```

---

## 6. Criterios de Aceptación

### 6.1 Para Nuevas Features

- [ ] Tests unitarios para toda lógica de negocio
- [ ] Tests de integración para flujos críticos
- [ ] Cobertura mínima 80% en líneas
- [ ] Documentación Given-When-Then en tests de validación
- [ ] Todos los tests pasan (0 failures)

### 6.2 Para Refactoring

- [ ] Tests existentes siguen pasando
- [ ] Cobertura no disminuye
- [ ] Nuevos tests para código refactorizado

---

## 7. Comandos de Ejecución

```bash
# Ejecutar todos los tests
npm run test

# Tests con cobertura (CI)
npm run test:ci

# Generar reporte de cobertura
npm run test:coverage

# Abrir reporte HTML
npm run coverage:open
```

---

## 8. Reporte de Cobertura

El reporte HTML está disponible en:
```
coverage/cyberguard-system-app/index.html
```

Formatos generados:
- **HTML**: Visualización interactiva (similar a JaCoCo)
- **LCOV**: Para integración con CI/CD
- **JSON**: Para procesamiento automatizado
- **Text**: Resumen en consola

---

## 9. Evidencias

### 9.1 Screenshot de Cobertura
Ver archivo: `docs/evidence/coverage-report-2026-02-23.png`

### 9.2 Resultado de Tests
```
Test Files  36 passed (36)
     Tests  321 passed (321)
  Duration  9.70s
```

---

## Autores

- Equipo de Desarrollo CyberGuard
- Fecha: 23 de febrero de 2026
