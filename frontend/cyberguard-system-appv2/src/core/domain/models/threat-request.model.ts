import { ThreatType } from './threat-type.enum';
import { ThreatSeverity } from './threat-severity.enum';

export interface ThreatRequest {
  type: ThreatType;
  severity: ThreatSeverity;
  sourceIp: string;
  targetIp?: string;
  description: string;
  metadata?: Record<string, unknown>;
}
