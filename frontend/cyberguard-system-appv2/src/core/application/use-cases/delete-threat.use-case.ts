import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DeleteThreatResult } from '../../domain/models/delete-threat-result.model';
import { ThreatDomainService } from '../../domain/services/threat-domain.service';

/**
 * Use case para eliminar una amenaza por su ID.
 */
@Injectable({ providedIn: 'root' })
export class DeleteThreatUseCase {
  private threatDomainService = inject(ThreatDomainService);

  execute(threatId: string): Observable<DeleteThreatResult> {
    return this.threatDomainService.deleteThreat(threatId);
  }
}
