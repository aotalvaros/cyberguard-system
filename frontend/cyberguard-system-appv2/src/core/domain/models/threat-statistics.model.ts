export interface ThreatStatistics {
  readonly totalThreats: number;
  readonly byType: Readonly<Record<string, number>>;
  readonly bySeverity: Readonly<Record<string, number>>;
  readonly last24Hours: number;
  readonly criticalActive: number;
}

export const EMPTY_STATISTICS: ThreatStatistics = {
  totalThreats: 0,
  byType: {},
  bySeverity: {},
  last24Hours: 0,
  criticalActive: 0,
} as const;
