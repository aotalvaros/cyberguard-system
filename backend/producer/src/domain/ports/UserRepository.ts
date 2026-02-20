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
  readonly isLocked: boolean;
  readonly failedAttempts: number;
  readonly lastLogin: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findAll(): Promise<UserRecord[]>;
  save(user: UserRecord): Promise<UserRecord>;
  update(id: string, data: Partial<UserRecord>): Promise<UserRecord>;
  delete(id: string): Promise<boolean>;
  resetFailedAttempts(id: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
  incrementFailedAttempts(id: string): Promise<void>;
  lockUser(id: string): Promise<void>;
}
