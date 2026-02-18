import { Observable } from 'rxjs';
import { ThreatRequest } from '../models/threat-request.model';
import { ThreatResponse } from '../models/threat-response.model';

export abstract class ThreatRepository {
  abstract reportThreat(threat: ThreatRequest): Observable<ThreatResponse>;
}
