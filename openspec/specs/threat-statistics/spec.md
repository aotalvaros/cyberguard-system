# Threat Statistics

## Purpose

This capability provides real-time threat statistics for the CyberGuard dashboard, enabling operators to monitor threat activity at a glance. It follows hexagonal architecture with domain models, abstract repository ports, use cases, and presentation components.

## Requirements

### Requirement: ThreatStatistics domain model
The system SHALL define a `ThreatStatistics` read-only interface containing `totalThreats: number`, `byType: Readonly<Record<string, number>>`, `bySeverity: Readonly<Record<string, number>>`, `last24Hours: number`, and `criticalActive: number`. An `EMPTY_STATISTICS` constant SHALL provide zero-value defaults for all fields.

#### Scenario: EMPTY_STATISTICS provides safe zero-value defaults
- **Given** the module `threat-statistics.model.ts` is imported
- **When** `EMPTY_STATISTICS` is accessed without any prior API call
- **Then** `totalThreats` SHALL equal `0`
- **And** `last24Hours` SHALL equal `0`
- **And** `criticalActive` SHALL equal `0`
- **And** `byType` SHALL be an empty object `{}`
- **And** `bySeverity` SHALL be an empty object `{}`

### Requirement: StatisticsRepository abstract port
The system SHALL provide an abstract class `StatisticsRepository` with a single abstract method `getStatistics(): Observable<ThreatStatistics>`. This abstract class SHALL be usable as an Angular DI token.

#### Scenario: Concrete implementation is resolved via DI token
- **Given** `{ provide: StatisticsRepository, useClass: StatisticsHttpRepository }` is registered in the root providers
- **When** Angular resolves a dependency declared as `StatisticsRepository`
- **Then** the injected instance SHALL be a `StatisticsHttpRepository`
- **And** the instance SHALL satisfy the `getStatistics()` contract

### Requirement: GetStatisticsUseCase application service
The system SHALL provide `GetStatisticsUseCase` annotated with `@Injectable({ providedIn: 'root' })`. Its `execute()` method SHALL delegate to `StatisticsRepository.getStatistics()` and return the resulting `Observable<ThreatStatistics>` unchanged.

#### Scenario: Use case delegates to repository exactly once
- **Given** a mock `StatisticsRepository` that returns `of(mockStats)`
- **When** `execute()` is called once
- **Then** `StatisticsRepository.getStatistics()` SHALL have been called exactly `1` time
- **And** the emitted value SHALL deep-equal `mockStats`

#### Scenario: Use case propagates repository errors without swallowing
- **Given** a mock `StatisticsRepository` whose `getStatistics()` returns `throwError(() => new Error('DB error'))`
- **When** the observable returned by `execute()` is subscribed to
- **Then** the error callback SHALL receive an `Error` with message `'DB error'`
- **And** the complete callback SHALL NOT be called

### Requirement: StatisticsHttpRepository infrastructure adapter
The system SHALL provide `StatisticsHttpRepository` extending `StatisticsRepository`. Its `getStatistics()` method SHALL issue `GET {environment.apiUrl}/statistics` via Angular `HttpClient`, unwrap the `{ success: boolean, data: ThreatStatistics }` envelope, and return `Observable<ThreatStatistics>`.

#### Scenario: Successful API response envelope is unwrapped
- **Given** `HttpClientTestingModule` is configured and the endpoint returns `{ success: true, data: { totalThreats: 42, byType: {}, bySeverity: {}, last24Hours: 8, criticalActive: 5 } }`
- **When** `getStatistics()` is called and the HTTP request is flushed
- **Then** the observable SHALL emit `{ totalThreats: 42, last24Hours: 8, criticalActive: 5, byType: {}, bySeverity: {} }`
- **And** the `success` field SHALL NOT appear in the emitted value

#### Scenario: Non-2xx HTTP response propagates as error
- **Given** `HttpClientTestingModule` is configured and the endpoint returns status `401`
- **When** `getStatistics()` is called and the HTTP request is flushed with the error
- **Then** the observable SHALL error with an `HttpErrorResponse`
- **And** `HttpErrorResponse.status` SHALL equal `401`

### Requirement: StatisticsHttpRepository is registered as StatisticsRepository
The system SHALL register `{ provide: StatisticsRepository, useClass: StatisticsHttpRepository }` in `app.config.ts` (or equivalent root providers).

#### Scenario: Angular DI resolves the correct concrete adapter at bootstrap
- **Given** the application bootstraps with the production `app.config.ts`
- **When** `TestBed.inject(StatisticsRepository)` is called in the test environment mirroring that config
- **Then** the returned instance SHALL be an `instanceof StatisticsHttpRepository`

### Requirement: StatisticsWidgetComponent presentation
The system SHALL provide a standalone Angular component `StatisticsWidgetComponent` (selector `app-statistics-widget`) that exposes `statistics$: Observable<ThreatStatistics>` initialised via `GetStatisticsUseCase.execute()` in `ngOnInit`. The template SHALL render `totalThreats`, `last24Hours`, `criticalActive`, the `byType` breakdown, and the `bySeverity` breakdown using `AsyncPipe`.

#### Scenario: Widget renders total threats count from observable
- **Given** `GetStatisticsUseCase.execute()` is stubbed to return `of({ totalThreats: 42, byType: {}, bySeverity: {}, last24Hours: 8, criticalActive: 5 })`
- **When** the component is created and the fixture is detected for changes
- **Then** the element bound to `totalThreats` SHALL contain the text `42`

#### Scenario: Widget renders criticalActive count from observable
- **Given** `GetStatisticsUseCase.execute()` is stubbed to return `of({ totalThreats: 0, byType: {}, bySeverity: {}, last24Hours: 0, criticalActive: 5 })`
- **When** the component is created and the fixture is detected for changes
- **Then** the element bound to `criticalActive` SHALL contain the text `5`

#### Scenario: Widget renders last24Hours count from observable
- **Given** `GetStatisticsUseCase.execute()` is stubbed to return `of({ totalThreats: 0, byType: {}, bySeverity: {}, last24Hours: 8, criticalActive: 0 })`
- **When** the component is created and the fixture is detected for changes
- **Then** the element bound to `last24Hours` SHALL contain the text `8`

#### Scenario: Widget shows empty state before observable emits
- **Given** `GetStatisticsUseCase.execute()` is stubbed to return a never-emitting observable
- **When** the component is created and the fixture is detected for changes
- **Then** the template SHALL render without throwing
- **And** the values SHALL reflect `EMPTY_STATISTICS` defaults or a loading indicator

### Requirement: StatisticsWidgetComponent integrated into Dashboard
The system SHALL include `<app-statistics-widget>` in the `DashboardComponent` template. `DashboardComponent` SHALL import `StatisticsWidgetComponent` in its `imports` array.

#### Scenario: Authenticated operator sees the statistics widget on the dashboard
- **Given** a user is authenticated and holds a valid JWT
- **When** the user navigates to the `/dashboard` route
- **Then** the `<app-statistics-widget>` element SHALL be present in the rendered DOM
- **And** the widget SHALL display the `totalThreats` value returned by `GET /api/statistics`

---

## Backend Requirements

### Requirement: Get aggregated threat statistics
The system SHALL expose a `GET /api/statistics` endpoint that returns aggregated statistics computed from all threats stored in PostgreSQL. The endpoint MUST require a valid Bearer JWT token via `authMiddleware`. The response MUST include total threat count, breakdown by type, breakdown by severity, count of threats in the last 24 hours, and count of critical active threats.

#### Scenario: Authenticated request returns statistics
- **WHEN** a client sends `GET /api/statistics` with a valid Bearer token
- **THEN** the system returns HTTP 200 with `{ "success": true, "data": { "totalThreats": <number>, "byType": <Record<string,number>>, "bySeverity": <Record<string,number>>, "last24Hours": <number>, "criticalActive": <number> } }`

#### Scenario: Unauthenticated request is rejected
- **WHEN** a client sends `GET /api/statistics` without a Bearer token or with an invalid token
- **THEN** the system returns HTTP 401 and does NOT return statistics data

### Requirement: Statistics are computed in real time
The system SHALL compute all statistics from the current state of the `threats` table at the time of the request. There MUST be no caching layer between the endpoint and the database.

#### Scenario: Statistics reflect newly added threats
- **WHEN** a new threat is created via `POST /api/threats` and then `GET /api/statistics` is called
- **THEN** the `totalThreats` value in the response MUST be incremented by 1 compared to the previous call

#### Scenario: Empty database returns zero values
- **WHEN** `GET /api/statistics` is called with an empty `threats` table
- **THEN** the response MUST contain `{ "totalThreats": 0, "byType": {}, "bySeverity": {}, "last24Hours": 0, "criticalActive": 0 }`

### Requirement: Statistics byType groups all known threat types
The system SHALL include counts for every `type` value that exists in the `threats` table. Types with zero occurrences SHALL NOT appear in the `byType` map.

#### Scenario: Multiple types are counted correctly
- **WHEN** the database has 3 `malware` threats and 2 `ddos` threats
- **THEN** `byType` MUST equal `{ "malware": 3, "ddos": 2 }`

#### Scenario: Unknown or future types are included dynamically
- **WHEN** a threat with a new `type` value not previously seen is stored
- **THEN** that type MUST appear in `byType` with the correct count

### Requirement: Statistics bySeverity groups all known severity levels
The system SHALL include counts for every `severity` value that exists in the `threats` table. Severity levels with zero occurrences SHALL NOT appear in the `bySeverity` map.

#### Scenario: Multiple severities are counted correctly
- **WHEN** the database has 5 `critical` threats and 10 `high` threats
- **THEN** `bySeverity` MUST equal `{ "critical": 5, "high": 10 }`

### Requirement: last24Hours counts only recent threats
The system SHALL count only threats whose `created_at` timestamp is within the last 24 hours from the time of the request.

#### Scenario: Old threats are excluded from last24Hours
- **WHEN** a threat has `created_at` older than 24 hours ago
- **THEN** it MUST NOT be counted in `last24Hours`

#### Scenario: Recent threats are included in last24Hours
- **WHEN** a threat has `created_at` within the last 24 hours
- **THEN** it MUST be counted in `last24Hours`

### Requirement: criticalActive counts all threats with severity critical
The system SHALL count all threats where `severity = 'critical'` regardless of their `created_at` timestamp.

#### Scenario: Only critical threats are counted
- **WHEN** there are 3 `critical` threats and 5 `high` threats in the database
- **THEN** `criticalActive` MUST equal 3

#### Scenario: No critical threats returns zero
- **WHEN** there are no threats with `severity = 'critical'`
- **THEN** `criticalActive` MUST equal 0

### Requirement: Statistics endpoint returns 500 on database failure
The system SHALL return HTTP 500 with `{ "success": false, "error": "Failed to retrieve statistics" }` if the database query fails, without exposing internal error details.

#### Scenario: Database connection error is handled gracefully
- **WHEN** the PostgreSQL pool throws an error during statistics retrieval
- **THEN** the endpoint MUST return HTTP 500 with `{ "success": false, "error": "Failed to retrieve statistics" }` and MUST NOT expose the database error message to the client

### Requirement: GetThreatStatisticsUseCase delegates to repository port
The `GetThreatStatisticsUseCase` application use case SHALL delegate all data retrieval to the `ThreatStatisticsRepository` port without applying any additional business logic or transformation.

#### Scenario: Use case calls repository exactly once per execution
- **WHEN** `GetThreatStatisticsUseCase.execute()` is called
- **THEN** `ThreatStatisticsRepository.getStatistics()` MUST be called exactly once

#### Scenario: Use case returns the repository result unchanged
- **WHEN** the repository returns a `ThreatStatistics` object
- **THEN** the use case MUST return that exact object without modification

#### Scenario: Use case propagates repository errors
- **WHEN** the repository throws an error
- **THEN** the use case MUST propagate that error without wrapping or catching it
