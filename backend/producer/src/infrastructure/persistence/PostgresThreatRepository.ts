import { query } from '../config/database';
import { ThreatRepository, Threat } from '../../domain/ports/ThreatRepository';
import { logger } from '../config/logger';

interface ThreatRow {
  readonly id: string;
  readonly event_id: string;
  readonly type: string;
  readonly severity: string;
  readonly source_ip: string;
  readonly target_ip: string | null;
  readonly description: string;
  readonly payload: Record<string, unknown> | null;
  readonly created_at: string;
}

export class PostgresThreatRepository implements ThreatRepository {

  async save(threat: Threat): Promise<string> {
    try {
      await query<ThreatRow>(
        `INSERT INTO threats (event_id, type, severity, source_ip, target_ip, description, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          threat.threatId,
          threat.type,
          threat.severity,
          threat.sourceIp,
          threat.targetIp ?? null,
          threat.description,
          threat.metadata ? JSON.stringify(threat.metadata) : null,
          threat.timestamp ?? new Date().toISOString()
        ]
      );

      logger.info('Threat saved to PostgreSQL', {
        threatId: threat.threatId,
        type: threat.type,
        severity: threat.severity
      });

      return threat.threatId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save threat to PostgreSQL', {
        threatId: threat.threatId,
        error: message
      });
      throw error;
    }
  }

  async findAll(): Promise<Threat[]> {
    try {
      const rows = await query<ThreatRow>(
        `SELECT id, event_id, type, severity, source_ip, target_ip, description, payload, created_at
         FROM threats
         ORDER BY created_at DESC`
      );

      return rows.map((row) => this.mapToThreat(row));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to fetch threats from PostgreSQL', { error: message });
      throw error;
    }
  }

  async findById(threatId: string): Promise<Threat | null> {
    try {
      const rows = await query<ThreatRow>(
        `SELECT id, event_id, type, severity, source_ip, target_ip, description, payload, created_at
         FROM threats
         WHERE event_id = $1`,
        [threatId]
      );

      if (rows.length === 0) return null;

      const row = rows[0];

      if (!row) return null;

      return this.mapToThreat(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to find threat by ID', {
        threatId,
        error: message
      });
      throw error;
    }
  }

  async delete(threatId: string): Promise<boolean> {
    try {
      const result = await query<ThreatRow>(
        `DELETE FROM threats WHERE event_id = $1 RETURNING id`,
        [threatId]
      );

      const deleted = result.length > 0;

      if (deleted) {
        logger.info('Threat deleted from PostgreSQL', { threatId });
      }

      return deleted;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to delete threat from PostgreSQL', {
        threatId,
        error: message
      });
      throw error;
    }
  }

  private mapToThreat(row: ThreatRow): Threat {
    return {
      threatId: row.event_id,
      type: row.type,
      severity: row.severity,
      sourceIp: row.source_ip,
      ...(row.target_ip ? { targetIp: row.target_ip } : {}),
      description: row.description,
      ...(row.payload ? { metadata: row.payload } : {}),
      timestamp: row.created_at
    };
  }
}
