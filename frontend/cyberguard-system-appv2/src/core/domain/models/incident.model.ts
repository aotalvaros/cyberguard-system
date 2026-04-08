export interface IncidentItem {
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
  readonly createdAt:   string;
  readonly updatedAt:   string;
}

export interface IncidentList {
  readonly incidents: IncidentItem[];
  readonly total:     number;
}

export interface CreateIncidentRequest {
  readonly threatId: string;
}

export interface CreateIncidentResponse {
  readonly success:  boolean;
  readonly incident: IncidentItem;
}
