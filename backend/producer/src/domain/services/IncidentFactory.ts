import { Threat } from '../entities/Threat';
import { InvalidIncidentCreationError, DuplicateIncidentError } from '../exceptions/IrmsExceptions';

export interface NewIncidentRecord {
  readonly threatId:   number;
  readonly severity:   string;
  readonly type:       string;
  readonly status:     'open';
  readonly assignedTo: null;
  readonly source:     string;
  readonly indicators: Record<string, unknown>;
}

export interface IncidentFactoryDeps {
  checkExistingIncident(threatDbId: number): Promise<boolean>;
}

export class IncidentFactory {
  constructor(private readonly deps: IncidentFactoryDeps) {}

  async createFromThreat(threat: Threat, threatDbId: number): Promise<NewIncidentRecord> {
    if (!threat.isHighSeverity()) {
      throw new InvalidIncidentCreationError(threatDbId, threat.severity);
    }

    const alreadyExists = await this.deps.checkExistingIncident(threatDbId);
    if (alreadyExists) {
      throw new DuplicateIncidentError(threatDbId);
    }

    return {
      threatId:   threatDbId,
      severity:   threat.severity,
      type:       threat.type,
      status:     'open',
      assignedTo: null,
      source:     threat.sourceIp,
      indicators: (threat.metadata ?? {}) as Record<string, unknown>,
    };
  }
}
