import { v4 as uuidv4 } from 'uuid';
import { IncidentStatus } from '../value-objects/IncidentStatus';
import { SeverityLevel, ThreatType } from './Threat';

export interface IncidentProps {
  id?:          string;
  threatId:     string;
  title:        string;
  status?:      IncidentStatus;
  severity:     SeverityLevel;
  type:         ThreatType;
  sourceIp?:    string;
  description?: string;
  createdBy:    string;
  assignedTo?:  string | null;
  createdAt?:   Date;
  updatedAt?:   Date;
}

export class Incident {
  private constructor(
    public readonly id:          string,
    public readonly threatId:    string,
    public readonly title:       string,
    public readonly status:      IncidentStatus,
    public readonly severity:    SeverityLevel,
    public readonly type:        ThreatType,
    public readonly sourceIp:    string | undefined,
    public readonly description: string | undefined,
    public readonly createdBy:   string,
    public readonly assignedTo:  string | null,
    public readonly createdAt:   Date,
    public readonly updatedAt:   Date,
  ) {}
  static create(props: IncidentProps): Incident {
    const now = new Date();
    return new Incident(
      props.id         ?? uuidv4(),
      props.threatId,
      props.title,
      props.status     ?? IncidentStatus.OPEN,
      props.severity,
      props.type,
      props.sourceIp,
      props.description,
      props.createdBy,
      props.assignedTo ?? null,
      props.createdAt  ?? now,
      props.updatedAt  ?? now,
    );
  }

  isActive(): boolean {
    return this.status !== IncidentStatus.CLOSED;
  }

  toPlainObject() {
    return {
      id:          this.id,
      threatId:    this.threatId,
      title:       this.title,
      status:      this.status,
      severity:    this.severity,
      type:        this.type,
      sourceIp:    this.sourceIp,
      description: this.description,
      createdBy:   this.createdBy,
      assignedTo:  this.assignedTo,
      createdAt:   this.createdAt.toISOString(),
      updatedAt:   this.updatedAt.toISOString(),
    };
  }
}
