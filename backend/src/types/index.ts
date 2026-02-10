export interface ThreatDetectedEvent {
  eventId: string;
  eventType: 'threat.detected';
  timestamp: string;
  data: {
    threatId: string;
    type: 'malware' | 'intrusion' | 'phishing' | 'ddos' | 'ransomware';
    severity: 'low' | 'medium' | 'high' | 'critical';
    sourceIp: string;
    targetIp?: string;
    description: string;
    metadata?: Record<string, any>;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    username: string;
    role: string;
  };
}

export interface ThreatRequest {
  type: 'malware' | 'intrusion' | 'phishing' | 'ddos' | 'ransomware';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIp: string;
  targetIp?: string;
  description: string;
  metadata?: Record<string, any>;
}
