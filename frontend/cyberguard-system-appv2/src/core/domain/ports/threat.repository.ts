import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ThreatRequest } from '../models/threat-request.model';
import { ThreatResponse } from '../models/threat-response.model';
import { ThreatList } from '../models/threat-list.model';
import { DeleteThreatResult } from '../models/delete-threat-result.model';

@Injectable()
export abstract class ThreatRepository {
  abstract reportThreat(threat: ThreatRequest): Observable<ThreatResponse>;
  abstract getThreats(): Observable<ThreatList>;
  abstract deleteThreat(threatId: string): Observable<DeleteThreatResult>;
}
