/**
 * Port: UserRepository
 *
 * Define el contrato para la persistencia de usuarios.
 * El dominio depende de esta interfaz; la infraestructura la implementa.
 */

export interface UserRecord {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly role: string;
  readonly phone: string | null;
  readonly isLocked: boolean;
  readonly failedAttempts: number;
  readonly lastLogin: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Datos permitidos para actualización de perfil.
 * ISP §3.4: excluye role, isLocked, failedAttempts — no modificables desde este flujo.
 */
export interface ProfileUpdateData {
  readonly username?: string;
  readonly email?: string;
  readonly phone?: string | null;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findAll(): Promise<UserRecord[]>;
  save(user: UserRecord): Promise<UserRecord>;
  update(id: string, data: Partial<UserRecord>): Promise<UserRecord>;
  updateProfile(id: string, data: ProfileUpdateData): Promise<UserRecord>;
  delete(id: string): Promise<boolean>;
  resetFailedAttempts(id: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
  incrementFailedAttempts(id: string): Promise<void>;
  lockUser(id: string): Promise<void>;
}
