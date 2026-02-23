## 1. Domain Layer (Port + Model)

- [x] 1.1 Create `src/domain/ports/ThreatStatisticsRepository.ts` with `ThreatStatistics` interface (readonly fields: `totalThreats`, `byType`, `bySeverity`, `last24Hours`, `criticalActive`) and `ThreatStatisticsRepository` port interface with `getStatistics(): Promise<ThreatStatistics>`

## 2. TDD — RED Phase (Tests before implementation)

- [x] 2.1 Create `src/__tests__/unit/application/use-cases/GetThreatStatisticsUseCase.test.ts` with typed mock `MockThreatStatisticsRepository implements ThreatStatisticsRepository` and 3 test cases: returns statistics from repo, calls repo exactly once, propagates repo errors — run `npm test` and confirm these tests FAIL (RED)
- [x] 2.2 Commit the failing tests to Git with message `test(RED): add GetThreatStatisticsUseCase unit tests before implementation`

## 3. Application Layer (Use Case)

- [x] 3.1 Create `src/application/use-cases/GetThreatStatisticsUseCase.ts` implementing the minimum code to make the 3 failing tests pass
- [x] 3.2 Run `npm test` and confirm all 3 new tests pass (GREEN) — commit with message `feat(GREEN): implement GetThreatStatisticsUseCase`
- [x] 3.3 Refactor if needed (no logic to add; use case is a pure delegator) — commit with message `refactor: GetThreatStatisticsUseCase clean pass`

## 4. Infrastructure — PostgreSQL Adapter

- [x] 4.1 Create `src/infrastructure/persistence/PostgresThreatStatisticsRepository.ts` implementing `ThreatStatisticsRepository` with 5 parallel SQL queries via `Promise.all`: total count, by-type GROUP BY, by-severity GROUP BY, last 24 hours count, critical count
- [x] 4.2 Ensure all `parseInt` calls use `?? '0'` fallback and no `any` types are used

## 5. Infrastructure — HTTP Controller

- [x] 5.1 Create `src/infrastructure/http/controllers/statistics.controller.ts` exporting `statisticsRouter` (Express Router) with `GET /` route protected by `authMiddleware`, calling `ServiceFactory.getStatisticsUseCase().execute()` and returning `{ success: true, data: stats }` or `{ success: false, error: "Failed to retrieve statistics" }` on error

## 6. Wiring — ServiceFactory + server.ts

- [x] 6.1 Add `getStatisticsUseCase()` static factory method to `src/infrastructure/factories/ServiceFactory.ts` — imports `PostgresThreatStatisticsRepository` and `GetThreatStatisticsUseCase`, uses `DatabaseConfig.getPool()`
- [x] 6.2 Add import of `statisticsRouter` in `src/server.ts` and mount with `app.use('/api/statistics', statisticsRouter)` before the `errorHandler`

## 7. Test Coverage Validation

- [x] 7.1 Run `npm test -- --coverage` in `backend/producer` and confirm all existing tests still pass (zero regressions)
- [x] 7.2 Confirm new 3 use case tests are in the passing suite
- [x] 7.3 Confirm global coverage ≥ 90% (statements, branches, functions, lines)
- [x] 7.4 Commit final state with message `feat: complete threat-statistics feature with TDD + full coverage`

## 8. QA Documentation

- [x] 8.1 Create `backend/producer/TESTING_STRATEGY_BACKEND.md` documenting: QA strategy overview, Verificar vs. Validar distinction with concrete test examples, TDD Red-Green-Refactor evidence (Git commit references), test report configuration, and coverage screenshot instructions
