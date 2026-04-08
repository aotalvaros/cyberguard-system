import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ThreatRequest } from '../../domain/models/threat-request.model';
import { ThreatResponse } from '../../domain/models/threat-response.model';
import { ThreatDomainService } from '../../domain/services/threat-domain.service';

@Injectable({ providedIn: 'root' })
export class ReportThreatUseCase {
  private threatDomainService = inject(ThreatDomainService);

  execute(threat: ThreatRequest): Observable<ThreatResponse> {
    return this.threatDomainService.reportThreat(threat);
  }
}
