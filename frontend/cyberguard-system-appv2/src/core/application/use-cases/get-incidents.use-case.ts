import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IncidentRepository } from '../../domain/ports/incident.repository';
import { IncidentList } from '../../domain/models/incident.model';

@Injectable({ providedIn: 'root' })
export class GetIncidentsUseCase {
  private incidentRepository = inject(IncidentRepository);

  execute(filters?: { status?: string; severity?: string }): Observable<IncidentList> {
    return this.incidentRepository.getIncidents(filters);
  }
}
