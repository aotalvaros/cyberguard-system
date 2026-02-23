## Why

The frontend currently has no mechanism to visualise aggregated threat data. Operators must read threats one by one to understand system health; a statistics dashboard widget fixes this by showing totals, breakdowns, and recent activity at a glance.

## What Changes

- Add domain model `ThreatStatistics` with its read-only interface and `EMPTY_STATISTICS` constant (frontend only).
- Add abstract domain port `StatisticsRepository` (Angular `abstract class`).
- Add application use case `GetStatisticsUseCase` that delegates to the port.
- Add infrastructure adapter `StatisticsHttpRepository` that calls `GET /api/statistics` and maps the `ApiResponse` envelope.
- Add standalone presentation component `StatisticsWidgetComponent` (ts + html + scss) that exposes an async stream of statistics.
- Integrate the widget into the existing Dashboard view.

## Capabilities

### New Capabilities
- `threat-statistics`: Full vertical slice for threat statistics in the Angular V2 frontend — domain model, domain port, application use case, HTTP adapter, and statistics widget component.

### Modified Capabilities

## Impact

- **Frontend (Angular V2):** `frontend/cyberguard-system-appv2/src/`
  - New files under `core/domain/models/`, `core/domain/ports/`, `core/application/use-cases/`, `infrastructure/adapters/http/`, and `features/dashboard/components/statistics-widget/`.
  - `app.config.ts` (or equivalent providers module) to register `StatisticsHttpRepository` as the concrete `StatisticsRepository`.
  - Existing dashboard view modified to include `<app-statistics-widget>`.
- **API dependency:** Consumes `GET /api/statistics` (backend already in scope; not modified by this change).
- **No breaking changes** to existing frontend routes, services, or components.
