import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { AuthService } from './auth.service';

export interface ThreatRequest {
  type: 'malware' | 'intrusion' | 'phishing' | 'ddos' | 'ransomware';
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceIp: string;
  targetIp?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ThreatService {
  private apiBase = environment.apiBase || environment.baseUrl.replace(/\/auth\/?$/, '');

  constructor(private http: HttpClient, private auth: AuthService) {}

  reportThreat(payload: ThreatRequest): Observable<any> {
    const token = this.auth.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.post(`${this.apiBase}/threats`, payload, { headers });
  }
}
