import { ThreatDataDto } from './threat.dto';

export interface WebSocketAlertDto {
  readonly eventId: string;
  readonly type?: string;
  readonly routingKey?: string;
  readonly data: ThreatDataDto;
  readonly receivedAt?: string;
  readonly processedAt?: string;
}

export interface WebSocketCommandDto {
  readonly type: 'clear-all' | 'delete-one';
  readonly id?: string;
}

export interface WebSocketClearResponseDto {
  readonly type: 'clear-all';
  readonly clearedAt: string;
}

export interface WebSocketDeleteResponseDto {
  readonly type: 'delete-one';
  readonly id: string;
  readonly deletedAt: string;
}
