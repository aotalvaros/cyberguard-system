
import { v4 as uuidv4 } from 'uuid';

export type ThreatType = 'malware' | 'intrusion' | 'phishing' | 'ddos' | 'ransomware';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatProps {
  threatId?: string;
  type: ThreatType;
  severity: SeverityLevel;
  sourceIp: string;
  targetIp?: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

export class Threat {
  private constructor(
    public readonly threatId: string,
    public readonly type: ThreatType,
    public readonly severity: SeverityLevel,
    public readonly sourceIp: string,
    public readonly description: string,
    public readonly targetIp?: string,
    public readonly metadata?: Record<string, any>,
    public readonly timestamp?: string
  ) {}


  static create(props: ThreatProps): Threat {
    return new Threat(
      props.threatId || uuidv4(),
      props.type,
      props.severity,
      props.sourceIp,
      props.description,
      props.targetIp,
      props.metadata,
      props.timestamp || new Date().toISOString()
    );
  }


  isHighSeverity(): boolean {
    return this.severity === 'high' || this.severity === 'critical';
  }


  isCritical(): boolean {
    return this.severity === 'critical';
  }


  toPlainObject() {
    return {
      threatId: this.threatId,
      type: this.type,
      severity: this.severity,
      sourceIp: this.sourceIp,
      targetIp: this.targetIp,
      description: this.description,
      metadata: this.metadata,
      timestamp: this.timestamp
    };
  }
}
