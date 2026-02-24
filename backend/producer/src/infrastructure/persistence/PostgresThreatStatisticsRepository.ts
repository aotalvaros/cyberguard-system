import { getPool } from '../config/database';
import type {
  ThreatStatistics,
  ThreatStatisticsRepository,
} from '../../domain/ports/ThreatStatisticsRepository';

interface CountRow {
  readonly count: string;
}

interface TypeCountRow {
  readonly type: string;
  readonly count: string;
}

interface SeverityCountRow {
  readonly severity: string;
  readonly count: string;
}

/**
 * Infrastructure Adapter: PostgresThreatStatisticsRepository
 *
 * Implements the ThreatStatisticsRepository port using PostgreSQL aggregate queries.
 * All 5 queries are executed in parallel via Promise.all to minimise response latency.
 * No mutations — fully read-only adapter.
 */
export class PostgresThreatStatisticsRepository
  implements ThreatStatisticsRepository
{
  async getStatistics(): Promise<ThreatStatistics> {
    const pool = getPool();

    const [total, byTypeResult, bySeverityResult, last24h, critical] =
      await Promise.all([
        pool.query<CountRow>('SELECT COUNT(*) AS count FROM threats'),
        pool.query<TypeCountRow>(
          'SELECT type, COUNT(*) AS count FROM threats GROUP BY type'
        ),
        pool.query<SeverityCountRow>(
          'SELECT severity, COUNT(*) AS count FROM threats GROUP BY severity'
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM threats
           WHERE created_at >= NOW() - INTERVAL '24 hours'`
        ),
        pool.query<CountRow>(
          `SELECT COUNT(*) AS count FROM threats WHERE severity = 'critical'`
        ),
      ]);

    return {
      totalThreats: parseInt(total.rows[0]?.count ?? '0', 10),
      byType: Object.fromEntries(
        byTypeResult.rows.map((r) => [r.type, parseInt(r.count, 10)])
      ),
      bySeverity: Object.fromEntries(
        bySeverityResult.rows.map((r) => [r.severity, parseInt(r.count, 10)])
      ),
      last24Hours: parseInt(last24h.rows[0]?.count ?? '0', 10),
      criticalActive: parseInt(critical.rows[0]?.count ?? '0', 10),
    };
  }
}
