
export interface ActiveIncidentRecord {
  readonly id: string;
  readonly threatId: string;
  readonly status: string;
  readonly assignedTo: string | null;
}

export interface IncidentRepository {
  findActiveByAssignedUserId(userId: string): Promise<ActiveIncidentRecord[]>;
  unassignByUserId(userId: string): Promise<number>;
}
