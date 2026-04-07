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

export const toThreatTypeDto = (type: ThreatType): ThreatTypeDto => {
  return type as ThreatTypeDto;
};

export const toThreatSeverityDto = (severity: ThreatSeverity): ThreatSeverityDto => {
  return severity as ThreatSeverityDto;
};

export const toThreatRequestDto = (threat: ThreatRequest): ThreatRequestDto => ({
  type: toThreatTypeDto(threat.type),
  severity: toThreatSeverityDto(threat.severity),
  sourceIp: threat.sourceIp,
  targetIp: threat.targetIp,
  description: threat.description,
  metadata: threat.metadata ? { ...threat.metadata } : undefined
});

export const toThreatResponse = (dto: ThreatResponseDto): ThreatResponse => ({
  threatId: dto.threatId
});

export const toThreatType = (type: ThreatTypeDto): ThreatType => {
  return type as ThreatType;
};

export const toThreatSeverity = (severity: ThreatSeverityDto): ThreatSeverity => {
  return severity as ThreatSeverity;
};

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

export const toThreatList = (dto: ThreatListResponseDto): ThreatList => ({
  threats: dto.threats.map(toThreatItem),
  total: dto.total
});

export const toDeleteThreatResult = (dto: DeleteThreatResponseDto): DeleteThreatResult => ({
  success: dto.success,
  threatId: dto.threatId,
  message: dto.message
});

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
