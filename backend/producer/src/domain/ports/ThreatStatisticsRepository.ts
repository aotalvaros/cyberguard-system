export interface ThreatStatistics {
  readonly totalThreats: number;
  readonly byType: Readonly<Record<string, number>>;
  readonly bySeverity: Readonly<Record<string, number>>;
  readonly last24Hours: number;
  readonly criticalActive: number;
}

export interface ThreatStatisticsRepository {
  getStatistics(): Promise<ThreatStatistics>;
}
