import { ThreatType } from './threat-type.enum';
import { ThreatSeverity } from './threat-severity.enum';

/**
 * Modelo de dominio para un item de amenaza.
 * Representa una amenaza almacenada en la base de datos.
 */
export interface ThreatItem {
  readonly threatId: string;
  readonly type: ThreatType;
  readonly severity: ThreatSeverity;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly timestamp: Date;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
