import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IncidentRepository } from '../../domain/ports/incident.repository';
import {
  IncidentList,
  CreateIncidentRequest,
  CreateIncidentResponse,
} from '../../domain/models/incident.model';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class IncidentRepositoryImpl extends IncidentRepository {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/incidents`;

  getIncidents(filters?: { status?: string; severity?: string }): Observable<IncidentList> {
    let params = new HttpParams();
    if (filters?.status)   params = params.set('status',   filters.status);
    if (filters?.severity) params = params.set('severity', filters.severity);
    return this.http.get<IncidentList>(this.API_URL, { params });
  }

  createIncident(request: CreateIncidentRequest): Observable<CreateIncidentResponse> {
    return this.http.post<CreateIncidentResponse>(this.API_URL, request);
  }
}
