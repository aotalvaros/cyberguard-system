# Estrategia de Testing - CyberGuard System Frontend

## Resumen Ejecutivo

Este documento define la estrategia de Quality Assurance (QA) para el frontend de CyberGuard System, diferenciando claramente entre **verificación** (¿estamos construyendo el producto correctamente?) y **validación** (¿estamos construyendo el producto correcto?).

## Métricas de Cobertura Alcanzadas

| Métrica | Valor | Objetivo |
|---------|-------|----------|
| Statements | 94.31% | ≥80% ✅ |
| Branches | 92.31% | ≥70% ✅ |
| Functions | 92.35% | ≥80% ✅ |
| Lines | 94.31% | ≥80% ✅ |
| Tests Passing | 325/325 | 100% ✅ |

---

## Metodología TDD Aplicada

### Feature: Threat Statistics Dashboard

Para la implementación del **Dashboard de Estadísticas de Amenazas** se aplicó estrictamente la metodología **Test-Driven Development (TDD)** siguiendo el ciclo **RED-GREEN-REFACTOR**.

### Ciclo TDD Implementado

```
┌─────────────────────────────────────────────────────────────┐
│                    CICLO RED-GREEN-REFACTOR                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────┐      ┌─────────┐      ┌──────────┐          │
│    │   RED   │ ──▶  │  GREEN  │ ──▶  │ REFACTOR │ ──┐      │
│    │  (Test  │      │  (Impl  │      │ (Mejora) │   │      │
│    │  Fails) │      │  Pasa)  │      │          │   │      │
│    └─────────┘      └─────────┘      └──────────┘   │      │
│         ▲                                           │      │
│         └───────────────────────────────────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Commits TDD (Evidencia del Proceso)

Se realizaron **19 commits atómicos** siguiendo el ciclo TDD:

| # | Fase | Descripción |
|---|------|-------------|
| 1 | 🔴 RED | `test(domain): add failing test for ThreatStatistics model` |
| 2 | 🟢 GREEN | `feat(domain): implement ThreatStatistics model` |
| 3 | 🔵 REFACTOR | `refactor(domain): add EMPTY_STATISTICS constant` |
| 4 | 🔴 RED | `test(domain): add failing test for StatisticsRepository port` |
| 5 | 🟢 GREEN | `feat(domain): implement StatisticsRepository abstract port` |
| 6 | 🔴 RED | `test(application): add failing test for GetStatisticsUseCase` |
| 7 | 🟢 GREEN | `feat(application): implement GetStatisticsUseCase` |
| 8 | 🔴 RED | `test(infrastructure): add failing test for StatisticsRepositoryImpl` |
| 9 | 🟢 GREEN | `feat(infrastructure): implement StatisticsRepositoryImpl` |
| 10 | 🔵 REFACTOR | `refactor(infrastructure): add getStatisticsSafe error handling` |
| 11 | 🔴 RED | `test(infrastructure): add failing test for mock repository` |
| 12 | 🟢 GREEN | `feat(infrastructure): implement StatisticsMockRepository` |
| 13 | 🔴 RED | `test(presentation): add failing test for StatisticsWidget` |
| 14 | 🟢 GREEN | `feat(presentation): implement StatisticsWidget component` |
| 15 | 🔵 REFACTOR | `refactor(presentation): extract stat-card to reusable partial` |
| 16 | 🔴 RED | `test(presentation): add failing test for dashboard integration` |
| 17 | 🟢 GREEN | `feat(presentation): integrate StatisticsWidget in Dashboard` |
| 18 | 🔵 REFACTOR | `refactor(di): configure StatisticsRepository DI provider` |
| 19 | 🔵 REFACTOR | `refactor(coverage): improve WebSocket testability` |
| 20 | 🔴 RED | `test(presentation): add failing test for Alerts integration` |
| 21 | 🟢 GREEN | `feat(presentation): implement Alerts integration test` |
| 22 | 🟢 GREEN | `docs: add TDD.md (testing guidance) and update AI_WORKFLOW.md` |

### Flujo TDD por Capa (Inside-Out)

```
1. Domain Layer
   ├── 🔴 Test: ThreatStatistics model structure
   ├── 🟢 Impl: threat-statistics.model.ts
   ├── 🔴 Test: StatisticsRepository port contract
   └── 🟢 Impl: statistics.repository.ts (abstract class)

2. Application Layer  
   ├── 🔴 Test: GetStatisticsUseCase behavior
   └── 🟢 Impl: get-statistics.use-case.ts

3. Infrastructure Layer
   ├── 🔴 Test: StatisticsRepositoryImpl HTTP calls
   ├── 🟢 Impl: statistics-repository.impl.ts
   ├── 🔴 Test: Mock repository for development
   └── 🟢 Impl: statistics-mock-repository.impl.ts

4. Presentation Layer
   ├── 🔴 Test: StatisticsWidget renders stats
   ├── 🟢 Impl: statistics-widget.component.ts
   ├── 🔴 Test: Dashboard shows widget
   └── 🟢 Impl: dashboard.component.html integration
```

### Ejemplo de Ciclo TDD Completo

**Fase RED** - Test que falla:
```typescript
// statistics.repository.spec.ts
describe('StatisticsRepository', () => {
  it('should be usable as an Angular DI token', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: StatisticsRepository, useClass: StubRepository }]
    });
    const repo = TestBed.inject(StatisticsRepository);
    expect(repo).toBeInstanceOf(StubRepository);
  });
});
// ❌ FAILS: StatisticsRepository is not defined
```

**Fase GREEN** - Implementación mínima:
```typescript
// statistics.repository.ts
export abstract class StatisticsRepository {
  abstract getStatistics(): Observable<ThreatStatistics>;
}
// ✅ PASSES
```

**Fase REFACTOR** - Mejora sin cambiar comportamiento:
```typescript
// Añadir método safe que no lanza errores
export abstract class StatisticsRepository {
  abstract getStatistics(): Observable<ThreatStatistics>;
  abstract getStatisticsSafe(): Observable<ThreatStatistics>;
}
// ✅ PASSES (tests actualizados)
```

### Beneficios Obtenidos con TDD

| Beneficio | Resultado |
|-----------|-----------|
| **Cobertura alta desde el inicio** | 100% en nuevos componentes |
| **Diseño guiado por tests** | Interfaces limpias y testeables |
| **Documentación viva** | Tests describen comportamiento esperado |
| **Refactoring seguro** | Suite de tests como red de seguridad |
| **Menos bugs en producción** | Defectos detectados temprano |

---

## Cambios recientes (resumen)

- Añadidos 2 tests de integración estilo TestBed: `dashboard.integration.spec.ts` y `alerts.integration.spec.ts`.
- Añadido `TDD.md` en `frontend/cyberguard-system-appv2/docs/` con la guía de trabajo TDD y listado de pruebas.
- Actualizada `AI_WORKFLOW.md` con el histórico de los cambios relacionados a testing.
- Branch creada: `feat/integration-tests-tdd-docs-2026-03-02` y PR abierto: https://github.com/aotalvaros/cyberguard-system/pull/48 (base: `develop`).

Notas técnicas:
- Las pruebas de integración usan adaptadores in-memory y mocks para WebSocket y repositorios, evitando servicios externos.
- Se aplicó mocking unitario consistente: `HttpClientTestingModule` para HTTP, stubs/impls para puertos, y factories para WebSocket.


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

## 10. Dependencias de pruebas y archivos clave

### 10.1 Dependencias usadas para Tests Unitarios

- `vitest` (devDependency) — runner y assertions (archivo: `package.json` devDependencies). Ejemplos de uso en:
  - `src/core/domain/models/__tests__/threat-statistics.model.spec.ts`
  - `src/core/application/use-cases/__tests__/get-statistics.use-case.spec.ts`
  - `src/core/infrastructure/mappers/__tests__/threat.mapper.spec.ts`
  - `src/core/infrastructure/services/__tests__/statistics-repository.impl.spec.ts`

- `jsdom` — entorno DOM para tests que usan renderizado/DOM APIs. Usado por tests de componentes y de integración (ej.: `dashboard.component.spec.ts`).

- `@vitest/coverage-v8` — generador de cobertura (provisto por V8). Configuración en `vitest.config.ts`.

- `@angular/core/testing` y utilidades de Angular — `TestBed`, `ComponentFixture`, `fakeAsync`, etc. Ejemplos de archivos:
  - `src/presentation/components/alerts/__tests__/alerts.component.spec.ts`
  - `src/presentation/guards/__tests__/auth.guard.spec.ts`

- `@angular/common/http/testing` (`HttpClientTestingModule`, `HttpTestingController`) — mock de HTTP en unit tests de repositorios/servicios:
  - `src/core/infrastructure/services/__tests__/statistics-repository.impl.spec.ts`
  - `src/core/infrastructure/services/__tests__/threat-repository.impl.spec.ts`

### 10.2 Dependencias usadas para Tests de Integración

- `vitest` + `jsdom` — mismo runner y entorno para integration specs que ejecutan `TestBed`.
- `@angular/core/testing` (`TestBed`) — para montar módulos y providers reales o test doubles. Integración relevante en:
  - `src/presentation/components/dashboard/__tests__/dashboard.integration.spec.ts`
  - `src/presentation/components/alerts/__tests__/alerts.integration.spec.ts`

- Adaptadores in-memory / mocks creados en las propias pruebas — localizados en los mismos archivos `__tests__` (se usan factories y `BehaviorSubject` para simular WebSocket y streams).

### 10.3 Dónde están declaradas estas dependencias

- `frontend/cyberguard-system-appv2/package.json` — sección `devDependencies` contiene `vitest`, `jsdom`, `@vitest/coverage-v8`.
- Las utilidades de Angular provienen de las dependencias de `@angular/*` listadas en `dependencies`.

### 10.4 Notas sobre el uso de mocks

- Mocks de HTTP: `HttpClientTestingModule` + `HttpTestingController` se usan para interceptar y resolver peticiones en pruebas unitarias de repositorios.
- Mocks de WebSocket: tests de alerts usan factories / `BehaviorSubject` para emitir eventos sin sockets reales. Revisa `alerts.integration.spec.ts` y `alerts.component.spec.ts`.
- Mocks de Storage y Repositories: se proporcionan stubs que implementan los puertos (`ThreatRepository`, `StatisticsRepository`, `AuthRepository`) en `__tests__` cuando se requiere aislamiento.

