<!-- ATDD/TDD cycle: RED → GREEN → REFACTOR.
     Write the acceptance/unit test first (RED), implement the minimum code to pass (GREEN), then clean up (REFACTOR).
     Each group follows that order: test task appears before the implementation task. -->

## 1. Domain Layer — TDD Cycle

- [x] 1.1 [RED] Write unit test asserting `EMPTY_STATISTICS` has zero values for all fields (file: `__tests__/threat-statistics.model.spec.ts`)
- [x] 1.2 [GREEN] Create `src/core/domain/models/threat-statistics.model.ts` with `ThreatStatistics` interface and `EMPTY_STATISTICS` constant until test passes
- [x] 1.3 [RED] Write unit test asserting `StatisticsRepository` is abstract and its token can be provided via Angular DI (file: `__tests__/statistics.repository.spec.ts`)
- [x] 1.4 [GREEN] Create `src/core/domain/ports/statistics.repository.ts` with abstract class `StatisticsRepository` until test passes
- [x] 1.5 [REFACTOR] Review domain types for full `readonly` coverage and remove any `any`

## 2. Application Layer — TDD Cycle

- [x] 2.1 [RED] Write failing unit tests covering: delegation to repository, single call assertion, and error propagation (file: `src/core/application/use-cases/__tests__/get-statistics.use-case.spec.ts`)
- [x] 2.2 [GREEN] Create `src/core/application/use-cases/get-statistics.use-case.ts` with `@Injectable({ providedIn: 'root' })` until all 3 scenarios from the spec are green
- [x] 2.3 [REFACTOR] Confirm no `any`, use `inject()` API consistent with existing use cases
- [x] 2.4 [VERIFY] `ng test` shows 100% pass rate for application layer

## 3. Infrastructure Layer — TDD Cycle

> ⚠️ El endpoint `GET /api/statistics` **no está implementado en backend**. Los tests de esta capa usan exclusivamente `HttpClientTestingModule` con respuestas simuladas. No realizar llamadas al servidor real hasta que el backend entregue el endpoint.

- [x] 3.1 [CONTRACT] Confirmar con el equipo de backend: nombres de campos, tipos y formato exacto del response body antes de definir la interfaz final
- [x] 3.2 [RED] Write failing unit tests for `StatisticsHttpRepository` using `HttpClientTestingModule` with flushed mock responses — NO real HTTP calls: envelope unwrap scenario and 401 error propagation scenario (file: `src/infrastructure/adapters/http/__tests__/statistics-http.repository.spec.ts`)
- [x] 3.3 [GREEN] Create `src/infrastructure/adapters/http/statistics-http.repository.ts` extending `StatisticsRepository` until both mocked HTTP scenarios are green
- [x] 3.4 [GREEN] Create `src/infrastructure/adapters/http/statistics-mock.repository.ts` implementing `StatisticsRepository` returning `of(MOCK_STATS)` — used for local development while backend is unavailable
- [x] 3.5 [RED] Write test asserting `TestBed.inject(StatisticsRepository)` returns `StatisticsHttpRepository` when providers mirror `app.config.ts`
- [x] 3.6 [GREEN] Register `{ provide: StatisticsRepository, useClass: StatisticsHttpRepository }` in `src/app/app.config.ts` (and `useClass: StatisticsMockRepository` in dev config) until DI test passes
- [x] 3.7 [REFACTOR] Review HTTP pipe chain — ensure `catchError` returns `EMPTY_STATISTICS` and re-throws for observability

## 4. Presentation Layer — ATDD + TDD Cycle

- [x] 4.1 [ATDD — RED] Write acceptance test asserting `<app-statistics-widget>` is present in `DashboardComponent`'s DOM when the user navigates to `/dashboard` (file: `src/presentation/components/dashboard/__tests__/dashboard.component.spec.ts`)
- [x] 4.2 [TDD — RED] Write failing component tests covering: totalThreats rendered, criticalActive rendered, last24Hours rendered, empty-state/loading (file: `src/presentation/components/dashboard/statistics-widget/statistics-widget.component.spec.ts`)
- [x] 4.3 [GREEN] Create `statistics-widget.component.ts` as standalone component wiring `GetStatisticsUseCase.execute()` in `ngOnInit` until unit tests pass
- [x] 4.4 [GREEN] Create `statistics-widget.component.html` rendering all five fields via `AsyncPipe` until template tests pass
- [x] 4.5 [GREEN] Create `statistics-widget.component.scss` with widget layout styles
- [x] 4.6 [GREEN] Add `StatisticsWidgetComponent` to `DashboardComponent` imports and include `<app-statistics-widget>` in `dashboard.component.html` until ATDD acceptance test passes
- [x] 4.7 [REFACTOR] Remove any `ngIf` duplication, extract binding expressions, ensure accessibility attributes on stat elements

## 5. Full Regression & Acceptance Validation

- [x] 5.1 Run full test suite (`ng test --coverage`) and confirm zero regressions and ≥ 80% coverage on new files
- [ ] 5.2 [ATDD — E2E] ⛔ **BLOQUEADO hasta que backend implemente `GET /api/statistics`** — una vez disponible: levantar stack con `docker-compose up`, autenticarse, navegar a `/dashboard` y verificar que el widget muestra el valor real de `totalThreats` devuelto por la API
- [ ] 5.3 [POST-BACKEND] Eliminar `StatisticsMockRepository` del dev config y confirmar que la app funciona end-to-end con datos reales de PostgreSQL
