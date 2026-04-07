export const ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
  USER: 'user'
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  WS_HISTORY: 'cg_ws_history'
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

export const WS_COMMANDS = {
  CLEAR_ALL: 'clear-all',
  DELETE_ONE: 'delete-one'
} as const;

export type WsCommandType = typeof WS_COMMANDS[keyof typeof WS_COMMANDS];

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

export const LIMITS = {
  MAX_WS_MESSAGES: 200
} as const;
