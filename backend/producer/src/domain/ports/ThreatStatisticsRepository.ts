/**
 * Domain Model: Aggregated threat statistics.
 * All fields are readonly — this is a pure value object from the domain perspective.
 */
export interface ThreatStatistics {
  readonly totalThreats: number;
  readonly byType: Readonly<Record<string, number>>;
  readonly bySeverity: Readonly<Record<string, number>>;
  readonly last24Hours: number;
  readonly criticalActive: number;
}

/**
 * Domain Port: Defines the contract for retrieving aggregated threat statistics.
 * Implementations live in the infrastructure layer (adapters).
 */
export interface ThreatStatisticsRepository {
  getStatistics(): Promise<ThreatStatistics>;
}
