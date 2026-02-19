import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ThreatList } from '../../domain/models/threat-list.model';
import { ThreatDomainService } from '../../domain/services/threat-domain.service';

/**
 * Use case para obtener la lista de amenazas almacenadas.
 */
@Injectable({ providedIn: 'root' })
export class GetThreatsUseCase {
  private threatDomainService = inject(ThreatDomainService);

  execute(): Observable<ThreatList> {
    return this.threatDomainService.getThreats();
  }
}
