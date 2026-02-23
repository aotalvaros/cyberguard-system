/**
 * ⚠️ HUMAN CHECK: Archivo de constantes centralizado
 * 
 * Decisión técnica: Centralizamos todos los strings "mágicos" en este archivo
 * para evitar typos y facilitar cambios futuros. Usamos 'as const' para obtener
 * tipos literales y mejor autocompletado en el IDE.
 * 
 * Principio aplicado: DRY (Don't Repeat Yourself)
 * Si el backend cambia un valor (ej: 'admin' -> 'administrator'), 
 * solo modificamos este archivo.
 * 
 * Constantes de la aplicación CyberGuard
 * Archivo centralizado para evitar strings hardcodeados en el código
 */

/**
 * Roles de usuario disponibles en el sistema
 */
export const ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
  USER: 'user'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

/**
 * Claves de almacenamiento en localStorage
 */
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  WS_HISTORY: 'cg_ws_history'
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/**
 * Tipos de comandos WebSocket
 */
export const WS_COMMANDS = {
  CLEAR_ALL: 'clear-all',
  DELETE_ONE: 'delete-one'
} as const;

export type WsCommandType = typeof WS_COMMANDS[keyof typeof WS_COMMANDS];

/**
 * Severidades de amenazas (para uso en filtros y validaciones)
 * Nota: También existe ThreatSeverity enum para uso en formularios
 */
export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const SEVERITY_LIST = [
  SEVERITY_LEVELS.LOW,
  SEVERITY_LEVELS.MEDIUM,
  SEVERITY_LEVELS.HIGH,
  SEVERITY_LEVELS.CRITICAL
] as const;

export type SeverityLevel = typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS];

/**
 * Configuración de límites
 */
export const LIMITS = {
  MAX_WS_MESSAGES: 200
} as const;
