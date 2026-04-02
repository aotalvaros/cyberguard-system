import { query } from '../config/database';
import { IncidentRepository, IncidentRecord, ActiveIncidentRecord } from '../../domain/ports/IncidentRepository';
import { logger } from '../config/logger';

interface IncidentRow {
  readonly id:          string;
  readonly threat_id:   string;
  readonly title:       string;
  readonly status:      string;
  readonly severity:    string;
  readonly type:        string;
  readonly source_ip:   string | null;
  readonly description: string | null;
  readonly created_by:  string;
  readonly assigned_to: string | null;
  readonly created_at:  Date;
  readonly updated_at:  Date;
}

function rowToIncidentRecord(row: IncidentRow): IncidentRecord {
  return {
    id:          row.id,
    threatId:    row.threat_id,
    title:       row.title,
    status:      row.status,
    severity:    row.severity,
    type:        row.type,
    sourceIp:    row.source_ip,
    description: row.description,
    createdBy:   row.created_by,
    assignedTo:  row.assigned_to,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export class PostgresIncidentRepository implements IncidentRepository {

  async save(incident: IncidentRecord): Promise<IncidentRecord> {
    try {
      const rows = await query<IncidentRow>(
        `INSERT INTO incidents
           (id, threat_id, title, status, severity, type, source_ip, description, created_by, assigned_to)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          incident.id,
          incident.threatId,
          incident.title,
          incident.status,
          incident.severity,
          incident.type,
          incident.sourceIp   ?? null,
          incident.description ?? null,
          incident.createdBy,
          incident.assignedTo ?? null,
        ],
      );
      logger.info('Incident saved to DB', { incidentId: incident.id });
      if (!rows[0]) throw new Error(`INSERT did not return a row for incident ${incident.id}`);
      return rowToIncidentRecord(rows[0]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save incident', { incidentId: incident.id, error: message });
      throw error;
    }
  }

  async findAll(filters?: { status?: string; severity?: string }): Promise<IncidentRecord[]> {
    try {
      const conditions: string[]  = [];
      const params:     unknown[] = [];

      if (filters?.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }
      if (filters?.severity) {
        conditions.push(`severity = $${params.length + 1}`);
        params.push(filters.severity);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows  = await query<IncidentRow>(
        `SELECT * FROM incidents ${where} ORDER BY created_at DESC`,
        params,
      );
      return rows.map(rowToIncidentRecord);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list incidents', { filters, error: message });
      throw error;
    }
  }

  async findById(id: string): Promise<IncidentRecord | null> {
    try {
      const rows = await query<IncidentRow>(
        `SELECT * FROM incidents WHERE id = $1`,
        [id],
      );
      return rows[0] ? rowToIncidentRecord(rows[0]) : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to find incident by id', { id, error: message });
      throw error;
    }
  }

  async findActiveByThreatId(threatId: string): Promise<IncidentRecord | null> {
    try {
      const rows = await query<IncidentRow>(
        `SELECT * FROM incidents WHERE threat_id = $1 AND status != 'closed' LIMIT 1`,
        [threatId],
      );
      return rows[0] ? rowToIncidentRecord(rows[0]) : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to find active incident by threatId', { threatId, error: message });
      throw error;
    }
  }

  async findActiveByAssignedUserId(userId: string): Promise<ActiveIncidentRecord[]> {
    try {
      const rows = await query<Pick<IncidentRow, 'id' | 'threat_id' | 'status' | 'assigned_to'>>(
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
