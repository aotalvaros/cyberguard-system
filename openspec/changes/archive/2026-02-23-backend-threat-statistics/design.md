## Context

The CyberGuard backend (`backend/producer`) follows a strict Hexagonal Architecture with three layers:
- **Domain** — pure TypeScript interfaces and entities (zero external dependencies)
- **Application** — use cases that orchestrate domain ports
- **Infrastructure** — Express controllers, PostgreSQL adapters, factories

Currently `ServiceFactory` uses static singleton methods to wire dependencies. `server.ts` mounts routers for `/api/auth`, `/api/threats`, and `/api/admin`. A new read-only statistics endpoint must be added following the exact same patterns without touching existing code paths.

The `threats` table already has the necessary columns: `type`, `severity`, `status`, `created_at`.

## Goals / Non-Goals

**Goals:**
- Add `GET /api/statistics` following the existing hexagonal pattern (domain port → use case → infra adapter → controller)
- Achieve 100% unit test coverage on the new domain and application layers using TDD (RED → GREEN → REFACTOR)
- Maintain global test suite integrity (zero regressions, ≥ 90% coverage across the project)
- Document the QA strategy in `TESTING_STRATEGY_BACKEND.md`

**Non-Goals:**
- Caching or time-series storage of statistics (no Redis layer)
- Filtering statistics by date range or user (single aggregate view)
- Modifying any existing route, service, or repository
- Frontend implementation (out of scope for this change)

## Decisions

### Decision 1: New domain port `ThreatStatisticsRepository` (interface)

**Choice:** Define a new interface in `src/domain/ports/ThreatStatisticsRepository.ts` that exports both the `ThreatStatistics` model and the `ThreatStatisticsRepository` contract.

**Rationale:** Keeps the domain layer free of infrastructure concerns. The use case depends only on this interface, enabling easy substitution with mocks in unit tests without any database.

**Alternative considered:** Re-using `ThreatRepository` and adding a `getStatistics()` method. Rejected because it violates the Interface Segregation Principle — listing threats and aggregating statistics are distinct concerns.

---

### Decision 2: `Promise.all` for parallel SQL queries in the adapter

**Choice:** `PostgresThreatStatisticsRepository.getStatistics()` runs all 5 PostgreSQL aggregation queries in parallel using `Promise.all`.

**Rationale:** Minimizes response latency. Each query is independent and read-only. The existing `pg.Pool` from `DatabaseConfig.getPool()` handles connection reuse automatically.

**Alternative considered:** A single SQL query using multiple CTEs or subqueries. Rejected because it increases SQL complexity and makes individual queries harder to test in isolation.

---

### Decision 3: Factory method in `ServiceFactory` (no singleton cache for statistics)

**Choice:** `ServiceFactory.getStatisticsUseCase()` creates a new `PostgresThreatStatisticsRepository` and `GetThreatStatisticsUseCase` per call instead of caching.

**Rationale:** The use case is stateless and lightweight. Avoiding a singleton sidesteps issues with stale references during tests. This matches the pattern used by `getListThreatsUseCase()` in the existing factory.

---

### Decision 4: TDD cycle for application layer

**Choice:** Write `GetThreatStatisticsUseCase.test.ts` **before** implementing the use case source file. The test file references the not-yet-existing implementation, causing TypeScript to fail (RED). Then implement the minimum code to pass (GREEN). Refactor if needed.

**Rationale:** Required by the evaluation rubric. Git history will show the test commit before the implementation commit, providing auditable TDD evidence.

---

### Decision 5: Controller returns 500 without leaking error details

**Choice:** `statistics.controller.ts` catches all errors from the use case and returns `{ success: false, error: "Failed to retrieve statistics" }` with HTTP 500. The original error is logged server-side only.

**Rationale:** Prevents information disclosure of internal database error messages to unauthenticated or malicious clients. Follows the same pattern as `threat.controller.ts`.

## Risks / Trade-offs

- **[Risk] N+1 parallel queries under high load** → Mitigation: The pool (`pg.Pool`) caps concurrent connections; 5 parallel lightweight aggregate queries per request are within safe bounds for the expected load.
- **[Risk] `parseInt` silently returns `NaN` on unexpected DB output** → Mitigation: Use `?? '0'` fallback before parsing; unit tests for the adapter validate integer conversion.
- **[Risk] Test isolation: existing suites may fail if `ServiceFactory` statics leak** → Mitigation: `jest.resetModules()` and `jest.clearAllMocks()` in `beforeEach` are already enforced by the existing `setup.ts`.

## Migration Plan

1. **Create files** (no breaking changes — purely additive):
   - `src/domain/ports/ThreatStatisticsRepository.ts`
   - `src/__tests__/unit/application/use-cases/GetThreatStatisticsUseCase.test.ts` ← **FIRST (TDD RED)**
   - `src/application/use-cases/GetThreatStatisticsUseCase.ts` ← GREEN
   - `src/infrastructure/persistence/PostgresThreatStatisticsRepository.ts`
   - `src/infrastructure/http/controllers/statistics.controller.ts`
2. **Modify files** (minimal, additive):
   - `src/infrastructure/factories/ServiceFactory.ts` — add `getStatisticsUseCase()` static method
   - `src/server.ts` — add `import` and `app.use('/api/statistics', statisticsRouter)`
3. **Validate**: `npm test` must pass with 0 failures and ≥ 90% global coverage.
4. **Rollback**: Remove the 5 new files and revert the 2 modified files — no DB migrations needed.

## Open Questions

- Should `criticalActive` exclude threats with `status = 'resolved'`? The spec currently counts all `severity = 'critical'` regardless of status. If business rules require active-only filtering, a `status` column filter must be added to the query — but this is left as a future enhancement to keep scope minimal.
