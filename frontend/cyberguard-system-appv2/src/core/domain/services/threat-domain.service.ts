import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ThreatRepository } from '../ports/threat.repository';
import { ThreatRequest } from '../models/threat-request.model';
import { ThreatResponse } from '../models/threat-response.model';
import { ThreatSeverity } from '../models/threat-severity.enum';
import { ThreatType } from '../models/threat-type.enum';

// ⚠️ HUMAN CHECK:
// Domain Service con lógica de negocio pura, sin dependencias de infraestructura
@Injectable({
  providedIn: 'root'
})
export class ThreatDomainService {
  private threatRepository = inject(ThreatRepository);

  reportThreat(threat: ThreatRequest): Observable<ThreatResponse> {
    return this.threatRepository.reportThreat(threat);
  }

  isCriticalThreat(threat: ThreatRequest): boolean {
    const criticalTypes = [ThreatType.RANSOMWARE, ThreatType.DDOS];
    return threat.severity === ThreatSeverity.CRITICAL || criticalTypes.includes(threat.type);
  }

  calculateThreatScore(threat: ThreatRequest): number {
    const severityScores = {
      [ThreatSeverity.LOW]: 1,
      [ThreatSeverity.MEDIUM]: 2,
      [ThreatSeverity.HIGH]: 3,
      [ThreatSeverity.CRITICAL]: 4
    };

    const typeMultipliers = {
      [ThreatType.RANSOMWARE]: 1.5,
      [ThreatType.DDOS]: 1.3,
      [ThreatType.MALWARE]: 1.2,
      [ThreatType.INTRUSION]: 1.1,
      [ThreatType.PHISHING]: 1.0
    };

    return severityScores[threat.severity] * typeMultipliers[threat.type];
  }

  sortThreatsBySeverity(threats: ThreatRequest[]): ThreatRequest[] {
    return [...threats].sort((a, b) => this.calculateThreatScore(b) - this.calculateThreatScore(a));
  }
}
