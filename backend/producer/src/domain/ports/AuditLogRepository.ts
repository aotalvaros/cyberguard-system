export interface AuditLogEntry {
  readonly userId: string | undefined;
  readonly action: string;
  readonly status: 'success' | 'failure';
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly details?: Record<string, unknown>;
}

export interface AuditLogRepository {
  log(entry: AuditLogEntry): Promise<void>;
}
