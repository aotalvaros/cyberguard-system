import { query } from '../config/database';
import { AuditLogRepository, AuditLogEntry } from '../../domain/ports/AuditLogRepository';
import { logger } from '../config/logger';

export class PostgresAuditLogRepository implements AuditLogRepository {

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, status, ip_address, user_agent, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          entry.userId ?? null,
          entry.action,
          entry.status,
          entry.ipAddress ?? null,
          entry.userAgent ?? null,
          entry.details ? JSON.stringify(entry.details) : null
        ]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to write audit log', {
        action: entry.action,
        error: message
      });
      throw error;
    }
  }
}
