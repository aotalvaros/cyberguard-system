import { Observable } from 'rxjs';
import {
  IncidentList,
  CreateIncidentRequest,
  CreateIncidentResponse,
} from '../models/incident.model';

export abstract class IncidentRepository {
  abstract getIncidents(filters?: { status?: string; severity?: string }): Observable<IncidentList>;
  abstract createIncident(request: CreateIncidentRequest): Observable<CreateIncidentResponse>;
}
