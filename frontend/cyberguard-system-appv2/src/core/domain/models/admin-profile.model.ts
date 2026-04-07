/**
 * AdminProfile — Modelo de dominio para perfil del administrador
 *
 * HUMAN CHECK: Excluir explícitamente campos sensibles (isLocked,
 * failedAttempts, passwordHash, firebaseUid) en el mapper del adaptador HTTP.
 *
 * Ref: §3.4 ISP — este modelo solo expone campos visibles al administrador.
 */
export interface AdminProfile {
  readonly username:  string;
  readonly email:     string;
  readonly role:      string;
  readonly phone:     string | null;
  readonly createdAt: string;
}

/**
 * ProfileUpdateData — datos mutables del perfil
 *
 * Ref: §3.1 SRP — separado de AdminProfile para que el contrato de escritura
 * sea independiente del contrato de lectura.
 * El campo `role` está AUSENTE intencionalmente (R-FE-03 / R-BE-04).
 */
export interface ProfileUpdateData {
  readonly username?: string;
  readonly email?:    string;
  readonly phone?:    string | null;
}
