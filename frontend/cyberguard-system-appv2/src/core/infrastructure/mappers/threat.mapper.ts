/**
 * Mappers para convertir entre DTOs de amenazas y modelos de dominio.
 */

import { 
  ThreatRequestDto, 
  ThreatResponseDto, 
  ThreatSeverityDto, 
  ThreatTypeDto,
  ThreatListResponseDto,
  ThreatItemDto,
  DeleteThreatResponseDto 
} from '../dto/threat.dto';
import { ThreatRequest } from '../../domain/models/threat-request.model';
import { ThreatResponse } from '../../domain/models/threat-response.model';
import { ThreatItem } from '../../domain/models/threat-item.model';
import { ThreatList } from '../../domain/models/threat-list.model';
import { DeleteThreatResult } from '../../domain/models/delete-threat-result.model';
import { ThreatType } from '../../domain/models/threat-type.enum';
import { ThreatSeverity } from '../../domain/models/threat-severity.enum';

/**
 * Convierte enum de tipo de amenaza de dominio a string de API
 */
export const toThreatTypeDto = (type: ThreatType): ThreatTypeDto => {
  return type as ThreatTypeDto;
};

/**
 * Convierte enum de severidad de dominio a string de API
 */
export const toThreatSeverityDto = (severity: ThreatSeverity): ThreatSeverityDto => {
  return severity as ThreatSeverityDto;
};

/**
 * Convierte modelo de dominio ThreatRequest a DTO de petición
 */
export const toThreatRequestDto = (threat: ThreatRequest): ThreatRequestDto => ({
  type: toThreatTypeDto(threat.type),
  severity: toThreatSeverityDto(threat.severity),
  sourceIp: threat.sourceIp,
  targetIp: threat.targetIp,
  description: threat.description,
  metadata: threat.metadata ? { ...threat.metadata } : undefined
});

/**
 * Convierte DTO de respuesta a modelo de dominio
 */
export const toThreatResponse = (dto: ThreatResponseDto): ThreatResponse => ({
  threatId: dto.threatId
});

/**
 * Convierte string de tipo de API a enum de dominio
 */
export const toThreatType = (type: ThreatTypeDto): ThreatType => {
  return type as ThreatType;
};

/**
 * Convierte string de severidad de API a enum de dominio
 */
export const toThreatSeverity = (severity: ThreatSeverityDto): ThreatSeverity => {
  return severity as ThreatSeverity;
};

/**
 * Convierte DTO de item de amenaza a modelo de dominio
 */
export const toThreatItem = (dto: ThreatItemDto): ThreatItem => ({
  threatId: dto.threatId,
  type: toThreatType(dto.type),
  severity: toThreatSeverity(dto.severity),
  sourceIp: dto.sourceIp,
  targetIp: dto.targetIp,
  description: dto.description,
  timestamp: new Date(dto.timestamp),
  metadata: dto.metadata ? { ...dto.metadata } : undefined
});

/**
 * Convierte DTO de lista de amenazas a modelo de dominio
 */
export const toThreatList = (dto: ThreatListResponseDto): ThreatList => ({
  threats: dto.threats.map(toThreatItem),
  total: dto.total
});

/**
 * Convierte DTO de eliminación a modelo de dominio
 */
export const toDeleteThreatResult = (dto: DeleteThreatResponseDto): DeleteThreatResult => ({
  success: dto.success,
  threatId: dto.threatId,
  message: dto.message
});

/**
 * Namespace para agrupar mappers de threat
 */
export const ThreatMapper = {
  toThreatTypeDto,
  toThreatSeverityDto,
  toThreatRequestDto,
  toThreatResponse,
  toThreatType,
  toThreatSeverity,
  toThreatItem,
  toThreatList,
  toDeleteThreatResult
} as const;
