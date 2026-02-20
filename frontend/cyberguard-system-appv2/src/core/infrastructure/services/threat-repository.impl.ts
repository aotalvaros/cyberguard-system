import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ThreatRepository } from '../../domain/ports/threat.repository';
import { ThreatRequest } from '../../domain/models/threat-request.model';
import { ThreatResponse } from '../../domain/models/threat-response.model';
import { ThreatList } from '../../domain/models/threat-list.model';
import { DeleteThreatResult } from '../../domain/models/delete-threat-result.model';
import { ThreatMapper } from '../mappers/threat.mapper';
import { ThreatResponseDto, ThreatListResponseDto, DeleteThreatResponseDto } from '../dto/threat.dto';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class ThreatRepositoryImpl extends ThreatRepository {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/api/threats`;

  reportThreat(threat: ThreatRequest): Observable<ThreatResponse> {
    // Convertir modelo de dominio a DTO
    const requestDto = ThreatMapper.toThreatRequestDto(threat);
    
    // El token se agrega automáticamente vía authInterceptor
    return this.http.post<ThreatResponseDto>(this.API_URL, requestDto).pipe(
      // Convertir DTO de respuesta a modelo de dominio
      map(dto => ThreatMapper.toThreatResponse(dto))
    );
  }

  getThreats(): Observable<ThreatList> {
    return this.http.get<ThreatListResponseDto>(this.API_URL).pipe(
      map(dto => ThreatMapper.toThreatList(dto))
    );
  }

  deleteThreat(threatId: string): Observable<DeleteThreatResult> {
    return this.http.delete<DeleteThreatResponseDto>(`${this.API_URL}/${threatId}`).pipe(
      map(dto => ThreatMapper.toDeleteThreatResult(dto))
    );
  }
}
