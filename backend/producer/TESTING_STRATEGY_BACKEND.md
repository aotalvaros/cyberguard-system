# Estrategia de Testing — Backend Producer (CyberGuard)

**Semana 2 · IA-Native Quality & TDD (Mid Level)**  
**Fecha:** 23 de febrero de 2026  
**Feature implementada:** `GET /api/statistics` — Sistema de Estadísticas de Amenazas  
**Evidencia TDD:** Rama `feature/hu-05/backend/analytics-and-reports`

---

## 1. QA vs Testing — Nuestra Estrategia

### QA (Aseguramiento de Calidad) — El "por qué"

La estrategia de QA de este proyecto se define **antes** de escribir código. Establecemos:

1. **Qué riesgos deben cubrirse** → definidos en los specs (`openspec/changes/backend-threat-statistics/specs/`)
2. **En qué capa vive cada tipo de prueba** → Domain/Application = unitarias, Infrastructure = integración
3. **Qué significa "hecho"** → 0 fallos de regresión, 100% cobertura en domain y application, la nueva feature tiene 5 tests unitarios que validan comportamiento y reglas de negocio

### Testing (Ejecución) — El "cómo"

| Tipo | Herramienta | Scope | Mocks |
|------|-------------|-------|-------|
| **Unitario — Domain** | Jest + ts-jest | Entidades, excepciones, value objects | Ninguno |
| **Unitario — Application** | Jest + ts-jest | Use cases | Mocks tipados (implementan el port) |
| **Unitario — Infrastructure** | Jest + ts-jest | Middlewares, providers, clasificadores | Mocks parciales |
| **Integración** | (pendiente: testcontainers) | Repositorios PostgreSQL reales | BD real en contenedor |

**Comando de ejecución:**
```bash
cd backend/producer
npm test                    # Suite completa
npm test -- --coverage      # Con reporte de cobertura → coverage/index.html
```

**Reporte automatizado:** generado en `backend/producer/coverage/` (HTML + LCOV).  
Ejecutar `xdg-open coverage/index.html` para visualizarlo en el navegador.

---

## 2. Ciclo TDD Red → Green → Refactor

### Evidencia en Git

| Commit | Fase | Descripción |
|--------|------|-------------|
| `660ddcb` | 🔴 **RED** | `test(RED): add GetThreatStatisticsUseCase unit tests before implementation` |
| `99fb71d` | 🟢 **GREEN** | `feat(GREEN): implement GetThreatStatisticsUseCase — all 5 tests pass` |

### ¿Cómo verificarlo?

```bash
# Ver los commits TDD en orden:
git log --oneline feature/hu-05/backend/analytics-and-reports

# Volver al commit RED y confirmar que los tests fallan:
git stash
git checkout 660ddcb
cd backend/producer && npx jest GetThreatStatisticsUseCase --no-coverage
# Expected: FAIL — TS2307 Cannot find module '...GetThreatStatisticsUseCase'

# Volver al estado GREEN:
git checkout feature/hu-05/backend/analytics-and-reports
git stash pop
cd backend/producer && npx jest GetThreatStatisticsUseCase --no-coverage
# Expected: PASS — 5 tests passed
```

### Secuencia real de commits

```
1. test(RED):  ThreatStatisticsRepository.ts (port) + test file que FALLA
               → Git confirma: tests referencian módulo inexistente
2. feat(GREEN): GetThreatStatisticsUseCase.ts implementado
               → Git confirma: 5/5 tests pasan
3. feat:       PostgresThreatStatisticsRepository + controller + wiring
               → 487/487 tests siguen pasando
4. test(GREEN): PostgresThreatStatisticsRepository.test.ts (8 tests) + statistics.controller.test.ts (11 tests)
               → 506/506 tests pasan
```

---

## 3. Verificar vs. Validar

### VERIFICAR — Pruebas de arquitectura y contrato técnico

> *"¿El código cumple el contrato definido por la interfaz del port?"*

```typescript
// VERIFICAR: El use case retorna lo que el repositorio devuelve sin transformación.
it('should return statistics from the repository unchanged', async () => {
  mockRepo.getStatistics.mockResolvedValue(mockStats);
  const result = await useCase.execute();
  expect(result).toEqual(mockStats);  // sin mapeo, sin filtro
});

// VERIFICAR: El use case llama al port exactamente una vez (SRP).
it('should call the repository exactly once per execute() call', async () => {
  mockRepo.getStatistics.mockResolvedValue(mockStats);
  await useCase.execute();
  expect(mockRepo.getStatistics).toHaveBeenCalledTimes(1);
});

// VERIFICAR: El use case maneja múltiples tipos y severidades sin perder datos.
it('should handle statistics with multiple types and severities', async () => {
  const richStats = { totalThreats: 100, byType: { malware: 30, ddos: 25, ... } };
  mockRepo.getStatistics.mockResolvedValue(richStats);
  const result = await useCase.execute();
  expect(Object.keys(result.byType)).toHaveLength(5);
});
```

**Archivo:** [src/__tests__/unit/aplication/use-cases/GetThreatStatisticsUseCase.test.ts](src/__tests__/unit/aplication/use-cases/GetThreatStatisticsUseCase.test.ts)

---

### VALIDAR — Pruebas de reglas de negocio

> *"¿El sistema protege las invariantes del dominio incluso cuando la infraestructura falla?"*

```typescript
// VALIDAR: Los errores de infraestructura NO se silencian.
// Regla: si la BD falla, el sistema no devuelve estadísticas incorrectas (0s
// silenciosos). Debe propagar el error para que el controller responda 500.
it('should propagate repository errors without catching them', async () => {
  const dbError = new Error('PostgreSQL connection refused');
  mockRepo.getStatistics.mockRejectedValue(dbError);

  await expect(useCase.execute()).rejects.toThrow('PostgreSQL connection refused');
  // Si el use case silenciara el error, la prueba pasaría incorrectamente.
  // Este test garantiza transparencia total de fallos (fail-fast).
});

// VALIDAR: Un sistema con cero amenazas es un estado VÁLIDO, no un error.
// Regla: la ausencia de datos no debe lanzar excepciones ni devolver null.
it('should return empty statistics when repository returns zeros', async () => {
  mockRepo.getStatistics.mockResolvedValue({
    totalThreats: 0, byType: {}, bySeverity: {}, last24Hours: 0, criticalActive: 0
  });
  const result = await useCase.execute();
  expect(result.totalThreats).toBe(0);   // 0 es válido
  expect(result.byType).toEqual({});      // objeto vacío, no null ni undefined
});
```

**Distinción clave:**
- **Verificar** → tests de estructura: ¿el código hace lo que la interfaz promete?
- **Validar** → tests de invariantes: ¿el negocio está protegido contra estados incorrectos?

---

## 4. Resultados de la Suite (Zero Errors)

### Suite completa — 23 de febrero de 2026

```
Test Suites: 21 passed, 21 total
Tests:       506 passed, 506 total   ← 100% pass rate (0 fallos)
Snapshots:   0 total
Time:        ~7s
```

### Nuevos tests introducidos por esta feature

| Test | Tipo | Verificar/Validar |
|------|------|-------------------|
| `should return statistics from the repository unchanged` | Unit | VERIFICAR |
| `should call the repository exactly once per execute() call` | Unit | VERIFICAR |
| `should propagate repository errors without catching them` | Unit | VALIDAR |
| `should return empty statistics when repository returns zeros` | Unit | VALIDAR |
| `should handle statistics with multiple types and severities` | Unit | VERIFICAR |
| `should return correct statistics when database has threats` | Unit (infra) | VERIFICAR |
| `should return zero statistics when the database is empty` | Unit (infra) | VALIDAR |
| `should default count to 0 and never return NaN when count row is missing` | Unit (infra) | VALIDAR |
| `should execute exactly 5 SQL queries per call` | Unit (infra) | VERIFICAR |
| `should use correct SQL clauses for each query` | Unit (infra) | VERIFICAR |
| `should propagate pool errors without catching them` | Unit (infra) | VALIDAR |
| `should return number types, not strings, for all numeric fields` | Unit (infra) | VERIFICAR |
| `should correctly map type and severity column names to record keys` | Unit (infra) | VERIFICAR |
| `GET /statistics — should return 200 with success:true and statistics data` | Unit (http) | VERIFICAR |
| `should return 500 with generic error message when use case throws` | Unit (http) | VALIDAR |
| `should NOT expose internal error details to the client` | Unit (http) | VALIDAR |
| `should invoke authMiddleware` | Unit (http) | VERIFICAR |

### Cobertura por capa (capa crítica del dominio = 100%)

| Capa | Cobertura | Meta |
|------|-----------|------|
| `application/use-cases` | **100%** ✅ | 100% |
| `domain/exceptions` | **100%** ✅ | 100% |
| `domain/services` | **100%** ✅ | 100% |
| `infrastructure/providers` | **100%** ✅ | ≥80% |
| `infrastructure/http/middlewares` | **92%** ✅ | ≥80% |
| `infrastructure/persistence` | **≥80%** ✅ | ≥80% |
| `infrastructure/http/controllers` | **≥80%** ✅ | ≥80% |

> **Nota:** La capa de infraestructura se testea con mocks del pool de PostgreSQL. Los tests de integración contra una BD real (testcontainers) son deuda técnica P2 documentada en `DEBT_REPORT_BACKEND.md`.

---

## 5. Mocks Tipados — Sin Magia, Sin Adivinanzas

Los mocks en los tests de aplicación implementan **interfaces del dominio**, no clases de infraestructura. Esto garantiza que al cambiar la implementación de PostgreSQL, los unit tests no necesitan actualización:

```typescript
// ✅ Mock tipado — implementa el PORT del dominio, no la clase concreta
class MockThreatStatisticsRepository implements ThreatStatisticsRepository {
  getStatistics = jest.fn<() => Promise<ThreatStatistics>>();
}
// → TypeScript valida que el mock cumple el contrato del port
// → Si el port cambia, el mock falla en compilación (no en runtime)

// ❌ Anti-patrón — mock sin tipado
const mockRepo = { getStatistics: jest.fn() };  // No hay garantía de tipo
```

---

## 6. Reporte Automatizado

El reporte de cobertura se genera automáticamente con:

```bash
cd backend/producer
npm test -- --coverage
```

Ubicación del reporte HTML: `backend/producer/coverage/index.html`  
Ubicación del LCOV: `backend/producer/coverage/lcov.info`  
(Compatible con CI/CD pipelines y herramientas como Codecov/SonarQube)

---

## 7. Checklist de Calidad — Pre-PR

- [x] 0 `any` en código de producción nuevo
- [x] Todos los métodos tienen tipado explícito
- [x] Port del dominio con campos `readonly`
- [x] Use case con constructor privado + DI
- [x] Tests escritos **antes** de la implementación (evidencia en Git)
- [x] Tests del dominio/application sin mocks de infraestructura real
- [x] Mock tipado con `implements ThreatStatisticsRepository`
- [x] 506/506 tests pasan (0 regresiones)
- [x] `npx tsc --noEmit` pasa sin errores
- [x] Commits TDD: RED (`660ddcb`) → GREEN (`99fb71d`) → infra tests (`ad5d1d1`) verificables en Git
