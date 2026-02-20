import { ThreatType } from './threat-type.enum';
import { ThreatSeverity } from './threat-severity.enum';

export interface ThreatRequest {
  readonly type: ThreatType;
  readonly severity: ThreatSeverity;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
