
export class InvalidIncidentCreationError extends Error {
  constructor(threatId: string | number, severity: string) {
    super(
      `Solo amenazas con severidad ALTA o CRÍTICA pueden generar incidentes. ` +
      `Amenaza '${threatId}' tiene severidad '${severity}'.`
    );
    this.name = 'InvalidIncidentCreationError';
  }
}

export class DuplicateIncidentError extends Error {
  constructor(threatId: string | number) {
    super(`Ya existe un incidente activo para esta amenaza (threatId: ${threatId})`);
    this.name = 'DuplicateIncidentError';
  }
}

export class ThreatNotFoundForIncidentError extends Error {
  constructor(threatId: string) {
    super(`Threat not found: '${threatId}'`);
    this.name = 'ThreatNotFoundForIncidentError';
  }
}
