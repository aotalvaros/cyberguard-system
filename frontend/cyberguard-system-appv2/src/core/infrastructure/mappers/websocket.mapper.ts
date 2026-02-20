/**
 * Mappers para convertir entre DTOs de WebSocket y modelos de dominio.
 */

import { WebSocketAlertDto, WebSocketCommandDto } from '../dto/websocket.dto';
import { AlertMessage } from '../../domain/models/alert-message.model';
import { WebSocketCommand } from '../../domain/models/websocket-command.model';

/**
 * Convierte DTO de alerta WebSocket a modelo de dominio
 */
export const toAlertMessage = (dto: WebSocketAlertDto): AlertMessage => ({
  eventId: dto.eventId,
  data: {
    threatId: dto.data.threatId,
    type: dto.data.type,
    severity: dto.data.severity,
    sourceIp: dto.data.sourceIp,
    description: dto.data.description
  },
  timestamp: dto.receivedAt ? new Date(dto.receivedAt).getTime() : Date.now()
});

/**
 * Convierte comando de dominio a DTO de WebSocket
 */
export const toWebSocketCommandDto = (command: WebSocketCommand): WebSocketCommandDto => ({
  type: command.type,
  id: command.id
});

/**
 * Namespace para agrupar mappers de WebSocket
 */
export const WebSocketMapper = {
  toAlertMessage,
  toWebSocketCommandDto
} as const;
