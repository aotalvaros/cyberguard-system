import { query } from '../config/database';
import { IncidentRepository, ActiveIncidentRecord } from '../../domain/ports/IncidentRepository';
import { logger } from '../config/logger';

interface IncidentRow {
  readonly id: string;
  readonly threat_id: string;
  readonly status: string;
  readonly assigned_to: string | null;
}

export class PostgresIncidentRepository implements IncidentRepository {

  async findActiveByAssignedUserId(userId: string): Promise<ActiveIncidentRecord[]> {
    try {
      const rows = await query<IncidentRow>(
        `SELECT id, threat_id, status, assigned_to
         FROM incidents
         WHERE assigned_to = $1 AND status != 'closed'`,
        [userId]
      );
      return rows.map(row => ({
        id:         row.id,
        threatId:   row.threat_id,
        status:     row.status,
        assignedTo: row.assigned_to,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to find active incidents by assigned user', { userId, error: message });
      throw error;
    }
  }

  async unassignByUserId(userId: string): Promise<number> {
    try {
      const rows = await query<{ id: string }>(
        `UPDATE incidents
         SET assigned_to = NULL, updated_at = NOW()
         WHERE assigned_to = $1 AND status != 'closed'
         RETURNING id`,
        [userId]
      );
      logger.info('Incidents unassigned due to user deactivation', { userId, count: rows.length });
      return rows.length;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to unassign incidents for user', { userId, error: message });
      throw error;
    }
  }
}
