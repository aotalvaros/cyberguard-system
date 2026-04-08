
export interface Threat {
  threatId: string;
  type: string;
  severity: string;
  sourceIp: string;
  targetIp?: string;
  description: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface ThreatRepository {
  save(threat: Threat): Promise<string>;

  findAll(): Promise<Threat[]>;

  findById(threatId: string): Promise<Threat | null>;

  delete(threatId: string): Promise<boolean>;
}
