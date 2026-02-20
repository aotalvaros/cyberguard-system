import { query } from '../config/database';
import { UserRepository, UserRecord } from '../../domain/ports/UserRepository';
import { logger } from '../config/logger';


interface UserRow {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly role: string;
  readonly is_locked: boolean;
  readonly failed_attempts: number;
  readonly last_login: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

function rowToUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    isLocked: row.is_locked,
    failedAttempts: row.failed_attempts,
    lastLogin: row.last_login ? new Date(row.last_login) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class PostgresUserRepository implements UserRepository {

  async findById(id: string): Promise<UserRecord | null> {
    try {
      const rows = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
      const row = rows[0];
      return row ? rowToUser(row) : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to find user by id', { id, error: message });
      throw error;
    }
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    try {
      const rows = await query<UserRow>('SELECT * FROM users WHERE username = $1', [username]);
      const row = rows[0];
      return row ? rowToUser(row) : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to find user by username', { username, error: message });
      throw error;
    }
  }

  async save(user: UserRecord): Promise<UserRecord> {
    try {
      const rows = await query<UserRow>(
        `INSERT INTO users (id, username, email, role, is_locked, failed_attempts, last_login, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          user.id,
          user.username,
          user.email,
          user.role,
          user.isLocked,
          user.failedAttempts,
          user.lastLogin,
          user.createdAt,
          user.updatedAt
        ]
      );
      const row = rows[0];
      if (!row) {
        throw new Error(`Failed to save user: no row returned for userId ${user.id}`);
      }
      logger.info('User saved to PostgreSQL', { userId: user.id, username: user.username });
      return rowToUser(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to save user', { userId: user.id, error: message });
      throw error;
    }
  }

  async update(id: string, data: Partial<UserRecord>): Promise<UserRecord> {
    try {
      const rows = await query<UserRow>(
        `UPDATE users SET
          role = COALESCE($2, role),
          is_locked = COALESCE($3, is_locked),
          failed_attempts = COALESCE($4, failed_attempts),
          last_login = COALESCE($5, last_login),
          updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id,
          data.role ?? null,
          data.isLocked ?? null,
          data.failedAttempts ?? null,
          data.lastLogin ?? null
        ]
      );
      const row = rows[0];
      if (!row) {
        throw new Error(`Failed to update user: no row returned for userId ${id}`);
      }
      return rowToUser(row);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to update user', { userId: id, error: message });
      throw error;
    }
  }

  async findAll(): Promise<UserRecord[]> {
    try {
      const rows = await query<UserRow>('SELECT * FROM users ORDER BY created_at DESC', []);
      return rows.map(rowToUser);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to list users', { error: message });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const rows = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      return rows.length > 0;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to delete user', { userId: id, error: message });
      throw error;
    }
  }

  async resetFailedAttempts(id: string): Promise<void> {
    await query('UPDATE users SET failed_attempts = 0, updated_at = NOW() WHERE id = $1', [id]);
  }

  async updateLastLogin(id: string): Promise<void> {
    await query('UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [id]);
  }

  async incrementFailedAttempts(id: string): Promise<void> {
    await query('UPDATE users SET failed_attempts = failed_attempts + 1, updated_at = NOW() WHERE id = $1', [id]);
  }

  async lockUser(id: string): Promise<void> {
    await query('UPDATE users SET is_locked = true, updated_at = NOW() WHERE id = $1', [id]);
  }
}
