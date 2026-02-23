## ADDED Requirements

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
