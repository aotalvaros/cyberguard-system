
import { ThreatRepository } from '../../domain/ports/ThreatRepository';
import { IncidentRepository, IncidentRecord } from '../../domain/ports/IncidentRepository';
import { AuditLogRepository } from '../../domain/ports/AuditLogRepository';
import { Incident } from '../../domain/entities/Incident';
import { IncidentStatus } from '../../domain/value-objects/IncidentStatus';
import { SeverityLevel, ThreatType } from '../../domain/entities/Threat';
import {
  ThreatNotFoundForIncidentError,
  InvalidIncidentCreationError,
  DuplicateIncidentError,
} from '../../domain/exceptions/IrmsExceptions';
import { logger } from '../../infrastructure/config/logger';

export interface CreateIncidentInput {
  threatId:  string;
  createdBy: string;
}

export interface CreateIncidentOutput {
  incident: IncidentRecord;
}

export class CreateIncidentUseCase {
  constructor(
    private readonly threatRepository:    ThreatRepository,
    private readonly incidentRepository:  IncidentRepository,
    private readonly auditLogRepository:  AuditLogRepository,
  ) {}

  async execute(input: CreateIncidentInput): Promise<CreateIncidentOutput> {
    const { threatId, createdBy } = input;

    const threat = await this.threatRepository.findById(threatId);
    if (!threat) {
      throw new ThreatNotFoundForIncidentError(threatId);
    }

    if (threat.severity !== 'high' && threat.severity !== 'critical') {
      throw new InvalidIncidentCreationError(threatId, threat.severity);
    }

    const existing = await this.incidentRepository.findActiveByThreatId(threatId);
    if (existing) {
      throw new DuplicateIncidentError(threatId);
    }

    const title    = `${threat.type} desde ${threat.sourceIp}`;
    const incident = Incident.create({
      threatId,
      title,
      severity:    threat.severity as SeverityLevel,
      type:        threat.type    as ThreatType,
      sourceIp:    threat.sourceIp,
      description: threat.description,
      status:      IncidentStatus.OPEN,
      createdBy,
      assignedTo:  null,
    });

    const record: IncidentRecord = {
      id:          incident.id,
      threatId:    incident.threatId,
      title:       incident.title,
      status:      incident.status,
      severity:    incident.severity,
      type:        incident.type,
      sourceIp:    incident.sourceIp ?? null,
      description: incident.description ?? null,
      createdBy:   incident.createdBy,
      assignedTo:  incident.assignedTo,
      createdAt:   incident.createdAt,
      updatedAt:   incident.updatedAt,
    };

    const saved = await this.incidentRepository.save(record);

    await this.auditLogRepository.log({
      userId:    createdBy,
      action:    'INCIDENT_CREATED',
      status:    'success',
      details:   { incidentId: saved.id, threatId, severity: saved.severity },
    }).catch((err: unknown) => {
      logger.error('Failed to log audit for INCIDENT_CREATED', {
        error: err instanceof Error ? err.message : String(err),
      });
    });

    logger.info('Incident created', { incidentId: saved.id, threatId, createdBy });

    return { incident: saved };
  }
}
