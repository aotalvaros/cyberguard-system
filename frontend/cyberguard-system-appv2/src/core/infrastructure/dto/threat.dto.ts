export type ThreatTypeDto = 'malware' | 'intrusion' | 'phishing' | 'ddos' | 'ransomware';

export type ThreatSeverityDto = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatRequestDto {
  readonly type: ThreatTypeDto;
  readonly severity: ThreatSeverityDto;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ThreatResponseDto {
  readonly threatId: string;
  readonly status?: string;
  readonly message?: string;
}

export interface ThreatDataDto {
  readonly threatId: string;
  readonly type: string;
  readonly severity: string;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ThreatItemDto {
  readonly threatId: string;
  readonly type: ThreatTypeDto;
  readonly severity: ThreatSeverityDto;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ThreatListResponseDto {
  readonly threats: ThreatItemDto[];
  readonly total: number;
}

export interface DeleteThreatResponseDto {
  readonly success: boolean;
  readonly threatId: string;
  readonly message: string;
}
