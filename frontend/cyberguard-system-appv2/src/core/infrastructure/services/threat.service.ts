import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportThreatUseCase } from '../../application/use-cases/report-threat.use-case';
import { ThreatRequest } from '../../domain/models/threat-request.model';
import { ThreatResponse } from '../../domain/models/threat-response.model';

@Injectable({ providedIn: 'root' })
export class ThreatService {
  private reportThreatUseCase = inject(ReportThreatUseCase);

  reportThreat(threat: ThreatRequest): Observable<ThreatResponse> {
    return this.reportThreatUseCase.execute(threat);
  }
}
