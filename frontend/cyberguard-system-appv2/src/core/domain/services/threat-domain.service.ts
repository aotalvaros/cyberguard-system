import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ThreatRepository } from '../ports/threat.repository';
import { ThreatRequest } from '../models/threat-request.model';
import { ThreatResponse } from '../models/threat-response.model';
import { ThreatList } from '../models/threat-list.model';
import { ThreatItem } from '../models/threat-item.model';
import { DeleteThreatResult } from '../models/delete-threat-result.model';
import { ThreatSeverity } from '../models/threat-severity.enum';
import { ThreatType } from '../models/threat-type.enum';

/**
 * ⚠️ HUMAN CHECK: Domain Service - capa de dominio pura
 * 
 * Este servicio SOLO contiene lógica de negocio relacionada con amenazas.
 * NO importa nada de infraestructura (HTTP, localStorage, etc.)
 * 
 * Principios aplicados:
 * - SRP: Solo maneja operaciones de amenazas
 * - DIP: Depende de abstracción (ThreatRepository), no de implementación
 * - ISP: El puerto ThreatRepository tiene métodos cohesivos
 * 
 * La validación de severidad y tipo usa enums del dominio,
 * evitando strings mágicos en la lógica de negocio.
 */
@Injectable({
  providedIn: 'root'
})
export class ThreatDomainService {
  private threatRepository = inject(ThreatRepository);

  reportThreat(threat: ThreatRequest): Observable<ThreatResponse> {
    return this.threatRepository.reportThreat(threat);
  }

  getThreats(): Observable<ThreatList> {
    return this.threatRepository.getThreats();
  }

  deleteThreat(threatId: string): Observable<DeleteThreatResult> {
    return this.threatRepository.deleteThreat(threatId);
  }

  isCriticalThreat(threat: ThreatRequest): boolean {
    const criticalTypes = [ThreatType.RANSOMWARE, ThreatType.DDOS];
    return threat.severity === ThreatSeverity.CRITICAL || criticalTypes.includes(threat.type);
  }

  isCriticalThreatItem(threat: ThreatItem): boolean {
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

  calculateThreatItemScore(threat: ThreatItem): number {
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

  sortThreatItemsBySeverity(threats: ThreatItem[]): ThreatItem[] {
    return [...threats].sort((a, b) => this.calculateThreatItemScore(b) - this.calculateThreatItemScore(a));
  }
}
