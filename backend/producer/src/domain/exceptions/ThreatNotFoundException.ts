import { DomainError } from './DomainError';

export class ThreatNotFoundException extends DomainError {
  constructor(threatId: string) {
    super(
      `Threat with ID ${threatId} not found`,
      'THREAT_NOT_FOUND',
      { threatId }
    );
  }
}
