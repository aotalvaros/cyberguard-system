/**
 * DTOs (Data Transfer Objects) para la API de amenazas (threats).
 * Representan exactamente la estructura de datos que viene/va al backend.
 */

/**
 * Valores válidos para tipo de amenaza según la API
 */
export type ThreatTypeDto = 'malware' | 'intrusion' | 'phishing' | 'ddos' | 'ransomware';

/**
 * Valores válidos para severidad según la API
 */
export type ThreatSeverityDto = 'low' | 'medium' | 'high' | 'critical';

/**
 * DTO para la petición de reporte de amenaza
 * POST /api/threats
 */
export interface ThreatRequestDto {
  readonly type: ThreatTypeDto;
  readonly severity: ThreatSeverityDto;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * DTO para la respuesta de reporte de amenaza exitoso
 * Response 201 de POST /api/threats
 */
export interface ThreatResponseDto {
  readonly threatId: string;
  readonly status?: string;
  readonly message?: string;
}

/**
 * DTO para los datos de amenaza en mensajes WebSocket
 */
export interface ThreatDataDto {
  readonly threatId: string;
  readonly type: string;
  readonly severity: string;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * DTO para un item de amenaza en la lista
 * GET /api/threats - Cada elemento del array threats
 */
export interface ThreatItemDto {
  readonly threatId: string;
  readonly type: ThreatTypeDto;
  readonly severity: ThreatSeverityDto;
  readonly sourceIp: string;
  readonly targetIp?: string;
  readonly description: string;
  readonly timestamp: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * DTO para la respuesta de listado de amenazas
 * GET /api/threats
 */
export interface ThreatListResponseDto {
  readonly threats: ThreatItemDto[];
  readonly total: number;
}

/**
 * DTO para la respuesta de eliminación de amenaza
 * DELETE /api/threats/:threatId
 */
export interface DeleteThreatResponseDto {
  readonly success: boolean;
  readonly threatId: string;
  readonly message: string;
}
