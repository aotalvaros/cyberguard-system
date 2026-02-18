import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ThreatRepository } from '../../domain/ports/threat.repository';
import { ThreatRequest } from '../../domain/models/threat-request.model';
import { ThreatResponse } from '../../domain/models/threat-response.model';
import { AuthService } from './auth.service';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class ThreatRepositoryImpl extends ThreatRepository {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly API_URL = `${environment.apiUrl}/api/threats`;

  reportThreat(threat: ThreatRequest): Observable<ThreatResponse> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<ThreatResponse>(this.API_URL, threat, { headers });
  }
}
