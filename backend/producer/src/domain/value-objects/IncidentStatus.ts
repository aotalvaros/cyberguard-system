
export enum IncidentStatus {
  OPEN           = 'open',
  CLASSIFIED     = 'classified',
  ASSIGNED       = 'assigned',
  IN_CONTAINMENT = 'in_containment',
  IN_ERADICATION = 'in_eradication',
  IN_RECOVERY    = 'in_recovery',
  RESOLVED       = 'resolved',
  CLOSED         = 'closed',
  ESCALATED      = 'escalated',
}

export const ACTIVE_INCIDENT_STATUSES: IncidentStatus[] = [
  IncidentStatus.OPEN,
  IncidentStatus.CLASSIFIED,
  IncidentStatus.ASSIGNED,
  IncidentStatus.IN_CONTAINMENT,
  IncidentStatus.IN_ERADICATION,
  IncidentStatus.IN_RECOVERY,
  IncidentStatus.RESOLVED,
  IncidentStatus.ESCALATED,
];

export function isActiveStatus(status: string): boolean {
  return ACTIVE_INCIDENT_STATUSES.includes(status as IncidentStatus);
}
