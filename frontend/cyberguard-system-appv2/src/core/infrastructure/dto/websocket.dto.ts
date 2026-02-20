/**
 * DTOs (Data Transfer Objects) para mensajes WebSocket.
 * Representan exactamente la estructura de datos que viene del servidor WebSocket.
 */

import { ThreatDataDto } from './threat.dto';

/**
 * DTO para mensaje de alerta recibido por WebSocket
 */
export interface WebSocketAlertDto {
  readonly eventId: string;
  readonly type?: string;
  readonly routingKey?: string;
  readonly data: ThreatDataDto;
  readonly receivedAt?: string;
  readonly processedAt?: string;
}

/**
 * DTO para comando enviado al servidor WebSocket
 */
export interface WebSocketCommandDto {
  readonly type: 'clear-all' | 'delete-one';
  readonly id?: string;
}

/**
 * DTO para respuesta de clear-all del servidor
 */
export interface WebSocketClearResponseDto {
  readonly type: 'clear-all';
  readonly clearedAt: string;
}

/**
 * DTO para respuesta de delete-one del servidor
 */
export interface WebSocketDeleteResponseDto {
  readonly type: 'delete-one';
  readonly id: string;
  readonly deletedAt: string;
}
