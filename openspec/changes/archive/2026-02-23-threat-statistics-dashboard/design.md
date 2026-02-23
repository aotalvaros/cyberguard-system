## Context

The Angular V2 frontend follows hexagonal architecture: domain models and abstract ports live in `core/domain/`, application use cases in `core/application/use-cases/`, infrastructure adapters in `infrastructure/adapters/http/`, and presentation components in `presentation/components/`. The existing patterns (e.g., `GetThreatsUseCase`, `ThreatRepository`, `ThreatHttpRepository`) serve as direct templates for this change.

**Current constraint:** The backend endpoint `GET /api/statistics` has NOT yet been implemented. The agreed contract is: protected by JWT, response envelope `{ success: boolean, data: ThreatStatistics }`. All frontend layers up to and including `StatisticsHttpRepository` can be built and fully unit-tested against mocked HTTP. The widget can be built and visually verified using a `StatisticsMockRepository`. End-to-end validation is blocked until the backend delivers the endpoint.

## Goals / Non-Goals

**Goals:**
- Introduce a read-only `ThreatStatistics` domain model and `EMPTY_STATISTICS` constant.
- Define an abstract `StatisticsRepository` port following the pattern of existing ports (`threat.repository.ts`, `auth.repository.ts`).
- Implement `GetStatisticsUseCase` as an `@Injectable({ providedIn: 'root' })` class delegating to the port.
- Implement `StatisticsHttpRepository` extending the abstract port, consuming `GET /api/statistics` via `HttpClient`, and unwrapping the API envelope.
- Register the concrete adapter via Angular DI in `app.config.ts`.
- Build `StatisticsWidgetComponent` as a standalone Angular component using `AsyncPipe` and exposing `statistics$: Observable<ThreatStatistics>`.
- Integrate the widget into the existing `DashboardComponent`.
- Provide unit tests for the use case and component following the project's Jasmine/Jest conventions.

**Non-Goals:**
- Backend implementation of `GET /api/statistics` (tracked in a separate backend change).
- Real-time / WebSocket polling of statistics.
- Caching or refresh logic beyond the initial HTTP call.
- Modification of any existing domain model, port, or use case.

## Decisions

### D1 — Abstract class as port (not `interface`)

Angular DI cannot inject TypeScript interfaces as tokens at runtime. All existing ports in this project (`ThreatRepository`, `AuthRepository`, `WebSocketRepository`) use `abstract class`. `StatisticsRepository` follows the same pattern so `{ provide: StatisticsRepository, useClass: StatisticsHttpRepository }` works without a custom `InjectionToken`.

*Alternative considered*: `InjectionToken<StatisticsRepository>` — rejected because it adds boilerplate and diverges from established conventions.

### D2 — `providedIn: 'root'` for the use case, explicit provider for the adapter

`GetStatisticsUseCase` is tree-shakable and globally available, matching the existing use cases. `StatisticsHttpRepository` must be registered explicitly in `app.config.ts` (alongside `ThreatHttpRepository`) so Angular resolves the abstract token to the concrete class.

### D3 — Standalone component with `AsyncPipe`

The component uses Angular's standalone API (matching `DashboardComponent` and peers) and subscribes via `AsyncPipe` to avoid manual subscription management and memory leaks.

### D4 — Placement inside `presentation/components/dashboard/`

The widget is a dashboard-scoped presentational component. Placing it under `presentation/components/dashboard/statistics-widget/` mirrors the existing `dashboard.component.ts` location and avoids polluting the shared feature space.

## Decisions

### D5 — StatisticsMockRepository for development & visual testing

Because the backend endpoint does not exist yet, a `StatisticsMockRepository` (implementing `StatisticsRepository`) will be created alongside the production adapter. It returns hardcoded `of(mockStats)` and is swapped in via providers during local development (`environment.ts` flag or a separate `app.config.dev.ts`). This lets UI development and component tests proceed independently of backend delivery.

*Removed when backend is live:* The mock provider is replaced by `StatisticsHttpRepository` in all environments and the mock file is deleted.

## Risks / Trade-offs

- **Backend not yet delivered** → All unit tests work against mocks; E2E acceptance is blocked. Mitigation: `StatisticsMockRepository` unblocks UI work; a clear interface contract is agreed with the backend team before implementation starts.
- **API contract drift** → The `ThreatStatistics` interface in the frontend must stay in sync with the backend response shape. Mitigation: the interface is declared `readonly` and narrowly typed; a breaking backend change will surface immediately as a TypeScript error.
- **Auth token propagation** → The HTTP adapter relies on an existing `AuthInterceptor` (or equivalent) to attach the `Authorization` header. If that interceptor is absent the call returns 401. Mitigation: verify `HttpClient` interceptor chain in `app.config.ts` before integration test.
- **Empty-state handling** → If the API call fails, `AsyncPipe` will propagate the error to the template. Mitigation: the use case or component wraps errors with `catchError` returning `EMPTY_STATISTICS`.

## Open Questions

- **[BLOCKING — backend]** When will `GET /api/statistics` be available in a dev/staging environment? Task 5.2 (E2E) cannot be completed until then.
- **[CONTRACT]** Confirm exact field names and types in the backend response (especially `byType` and `bySeverity` key casing) before merging `ThreatStatistics` model.
- **[AUTH]** Does the existing `AuthInterceptor` in the frontend already attach the JWT to all `/api/*` routes, or does `StatisticsHttpRepository` need explicit header handling?
