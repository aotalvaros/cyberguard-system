
export class InvalidIncidentCreationError extends Error {
  constructor(threatId: number, severity: string) {
    super(
      `Threat ${threatId} has severity '${severity}' which does not qualify for incident creation. ` +
      `Only 'high' and 'critical' are eligible.`
    );
    this.name = 'InvalidIncidentCreationError';
  }
}


export class DuplicateIncidentError extends Error {
  constructor(threatId: number) {
    super(`An active incident already exists for threat ${threatId}`);
    this.name = 'DuplicateIncidentError';
  }
}
