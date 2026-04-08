export interface ActiveIncidentRecord {
  readonly id:         string;
  readonly threatId:   string;
  readonly status:     string;
  readonly assignedTo: string | null;
}

export interface IncidentRecord {
  readonly id:          string;
  readonly threatId:    string;
  readonly title:       string;
  readonly status:      string;
  readonly severity:    string;
  readonly type:        string;
  readonly sourceIp:    string | null;
  readonly description: string | null;
  readonly createdBy:   string;
  readonly assignedTo:  string | null;
  readonly createdAt:   Date;
  readonly updatedAt:   Date;
}

export interface IncidentRepository {
  save(incident: IncidentRecord): Promise<IncidentRecord>;

  findAll(filters?: { status?: string; severity?: string }): Promise<IncidentRecord[]>;

  findById(id: string): Promise<IncidentRecord | null>;

  findActiveByThreatId(threatId: string): Promise<IncidentRecord | null>;

  findActiveByAssignedUserId(userId: string): Promise<ActiveIncidentRecord[]>;

  unassignByUserId(userId: string): Promise<number>;
}
