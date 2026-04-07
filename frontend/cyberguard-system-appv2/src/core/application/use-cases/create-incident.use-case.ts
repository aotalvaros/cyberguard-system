import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IncidentRepository } from '../../domain/ports/incident.repository';
import { CreateIncidentRequest, CreateIncidentResponse } from '../../domain/models/incident.model';

@Injectable({ providedIn: 'root' })
export class CreateIncidentUseCase {
  private incidentRepository = inject(IncidentRepository);

  execute(request: CreateIncidentRequest): Observable<CreateIncidentResponse> {
    return this.incidentRepository.createIncident(request);
  }
}
