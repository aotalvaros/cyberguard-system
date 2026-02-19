/**
 * Port: AuditLogRepository
 * 
 * Define el contrato para registrar eventos de auditoría.
 * El dominio depende de esta interfaz; la infraestructura la implementa.
 */

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
