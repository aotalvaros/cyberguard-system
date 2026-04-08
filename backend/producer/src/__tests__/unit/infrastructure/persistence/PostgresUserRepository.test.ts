/**
 * Unit Tests: PostgresUserRepository
 *
 * VERIFICAR: Cada método ejecuta el SQL correcto con los parámetros esperados.
 * VERIFICAR: rowToUser() convierte correctamente los tipos de pg → UserRecord.
 * VALIDAR:   Todos los métodos propagan errores sin silenciarlos.
 * VALIDAR:   save() / update() lanzan Error cuando no retornan fila.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const mockQuery = jest.fn<AsyncFn>();
jest.mock('../../../../infrastructure/config/database', () => ({ query: mockQuery }));
jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { PostgresUserRepository } from '../../../../infrastructure/persistence/PostgresUserRepository';
import { logger } from '../../../../infrastructure/config/logger';

// ─────────────────────────────────────────────────────────────────────────────

const baseRow = {
  id:              'user-id-1',
  username:        'alice',
  email:           'alice@example.com',
  role:            'analyst',
  full_name:       null,
  is_active:       true,
  is_locked:       false,
  failed_attempts: 0,
  last_login:      '2026-02-01T08:00:00.000Z',
  created_at:      '2026-01-01T00:00:00.000Z',
  updated_at:      '2026-02-01T08:00:00.000Z',
};

const baseRecord = {
  id:              'user-id-1',
  username:        'alice',
  email:           'alice@example.com',
  role:            'analyst',
  fullName:        null,
  isActive:        true,
  isLocked:        false,
  failedAttempts:  0,
  lastLogin:       new Date('2026-02-01T08:00:00.000Z'),
  createdAt:       new Date('2026-01-01T00:00:00.000Z'),
  updatedAt:       new Date('2026-02-01T08:00:00.000Z'),
};

describe('PostgresUserRepository', () => {
  let repository: PostgresUserRepository;

  beforeEach(() => {
    repository = new PostgresUserRepository();
    jest.clearAllMocks();
  });

  // ── findById ──────────────────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return UserRecord when user exists', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repository.findById('user-id-1');

      expect(result?.username).toBe('alice');
      expect(result?.isLocked).toBe(false);
    });

    it('should map last_login string to Date', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repository.findById('user-id-1');

      expect(result?.lastLogin).toBeInstanceOf(Date);
    });

    it('should return null when user does not exist', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null for lastLogin when last_login column is null', async () => {
      mockQuery.mockResolvedValueOnce([{ ...baseRow, last_login: null }]);

      const result = await repository.findById('user-id-1');

      expect(result?.lastLogin).toBeNull();
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db error'));

      await expect(repository.findById('user-id-1')).rejects.toThrow('db error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find user by id',
        expect.objectContaining({ error: 'db error' }),
      );
    });
  });

  // ── findByUsername ────────────────────────────────────────────────────────
  describe('findByUsername()', () => {
    it('should return UserRecord when username exists', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repository.findByUsername('alice');

      expect(result?.id).toBe('user-id-1');
    });

    it('should return null when username is not found', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.findByUsername('unknown');

      expect(result).toBeNull();
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('conn error'));

      await expect(repository.findByUsername('alice')).rejects.toThrow('conn error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find user by username',
        expect.objectContaining({ error: 'conn error' }),
      );
    });
  });

  // ── findByEmail ───────────────────────────────────────────────────────────
  describe('findByEmail()', () => {
    it('should return UserRecord when email exists', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repository.findByEmail('alice@example.com');

      expect(result?.id).toBe('user-id-1');
      expect(result?.email).toBe('alice@example.com');
    });

    it('should return null when email is not found', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('email lookup error'));

      await expect(repository.findByEmail('alice@example.com')).rejects.toThrow('email lookup error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find user by email',
        expect.objectContaining({ error: 'email lookup error' }),
      );
    });

    it('should stringify non-Error thrown from findByEmail()', async () => {
      mockQuery.mockRejectedValueOnce('crash' as never);

      await expect(repository.findByEmail('alice@example.com')).rejects.toBe('crash');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find user by email',
        expect.objectContaining({ error: 'crash' }),
      );
    });
  });

  // ── findAllActive ─────────────────────────────────────────────────────────
  describe('findAllActive()', () => {
    it('should return active users mapped from rows', async () => {
      mockQuery.mockResolvedValueOnce([baseRow, { ...baseRow, id: 'user-id-2', username: 'bob' }]);

      const result = await repository.findAllActive();

      expect(result).toHaveLength(2);
      expect(result[0]?.username).toBe('alice');
      expect(result[1]?.username).toBe('bob');
    });

    it('should return empty array when no active users exist', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.findAllActive();

      expect(result).toEqual([]);
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('active users error'));

      await expect(repository.findAllActive()).rejects.toThrow('active users error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to list active users',
        expect.objectContaining({ error: 'active users error' }),
      );
    });

    it('should stringify non-Error thrown from findAllActive()', async () => {
      mockQuery.mockRejectedValueOnce('crash' as never);

      await expect(repository.findAllActive()).rejects.toBe('crash');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to list active users',
        expect.objectContaining({ error: 'crash' }),
      );
    });
  });

  // ── save ──────────────────────────────────────────────────────────────────
  describe('save()', () => {
    it('should return the saved UserRecord', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repository.save(baseRecord);

      expect(result.username).toBe('alice');
      expect(result.id).toBe('user-id-1');
    });

    it('should log success after saving', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      await repository.save(baseRecord);

      expect(logger.info).toHaveBeenCalledWith(
        'User saved to PostgreSQL',
        expect.objectContaining({ userId: 'user-id-1' }),
      );
    });

    it('should throw when no row is returned (INSERT did not return)', async () => {
      mockQuery.mockResolvedValueOnce([]); // RETURNING * returned nothing

      await expect(repository.save(baseRecord)).rejects.toThrow(
        'Failed to save user: no row returned for userId user-id-1',
      );
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('duplicate key'));

      await expect(repository.save(baseRecord)).rejects.toThrow('duplicate key');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save user',
        expect.objectContaining({ error: 'duplicate key' }),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('should return the updated UserRecord', async () => {
      const updatedRow = { ...baseRow, role: 'admin' };
      mockQuery.mockResolvedValueOnce([updatedRow]);

      const result = await repository.update('user-id-1', { role: 'admin' });

      expect(result.role).toBe('admin');
    });

    it('should throw when no row is returned (UPDATE WHERE matched nothing)', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(
        repository.update('nonexistent', { role: 'admin' }),
      ).rejects.toThrow('Failed to update user: no row returned for userId nonexistent');
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('update error'));

      await expect(repository.update('user-id-1', {})).rejects.toThrow('update error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update user',
        expect.objectContaining({ error: 'update error' }),
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return all users mapped from rows', async () => {
      mockQuery.mockResolvedValueOnce([baseRow, { ...baseRow, id: 'user-id-2', username: 'bob' }]);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]?.username).toBe('alice');
      expect(result[1]?.username).toBe('bob');
    });

    it('should return empty array when no users exist', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('list error'));

      await expect(repository.findAll()).rejects.toThrow('list error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to list users',
        expect.objectContaining({ error: 'list error' }),
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should return true when user was deleted', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'user-id-1' }]);

      const result = await repository.delete('user-id-1');

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('delete error'));

      await expect(repository.delete('user-id-1')).rejects.toThrow('delete error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete user',
        expect.objectContaining({ error: 'delete error' }),
      );
    });
  });

  // ── Mutation helpers ──────────────────────────────────────────────────────
  describe('resetFailedAttempts()', () => {
    it('should execute UPDATE setting failed_attempts = 0', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repository.resetFailedAttempts('user-id-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('failed_attempts = 0'),
        ['user-id-1'],
      );
    });
  });

  describe('updateLastLogin()', () => {
    it('should execute UPDATE setting last_login = NOW()', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repository.updateLastLogin('user-id-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('last_login = NOW()'),
        ['user-id-1'],
      );
    });
  });

  describe('incrementFailedAttempts()', () => {
    it('should execute UPDATE incrementing failed_attempts by 1', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repository.incrementFailedAttempts('user-id-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('failed_attempts = failed_attempts + 1'),
        ['user-id-1'],
      );
    });
  });

  describe('lockUser()', () => {
    it('should execute UPDATE setting is_locked = true', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repository.lockUser('user-id-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('is_locked = true'),
        ['user-id-1'],
      );
    });
  });

  // ── update() with all Partial fields – ?? branch coverage ────────────────
  describe('update() – all optional fields provided', () => {
    it('should pass defined values for all Partial<UserRecord> fields', async () => {
      const updatedRow = {
        ...baseRow,
        role:            'admin',
        is_locked:       true,
        failed_attempts: 3,
        last_login:      '2026-03-01T12:00:00.000Z',
      };
      mockQuery.mockResolvedValueOnce([updatedRow]);

      const result = await repository.update('user-id-1', {
        role:           'admin',
        isLocked:       true,
        failedAttempts: 3,
        lastLogin:      new Date('2026-03-01T12:00:00.000Z'),
      });

      expect(result.role).toBe('admin');
      expect(result.isLocked).toBe(true);
      expect(result.failedAttempts).toBe(3);
      const params = mockQuery.mock.calls[0]?.[1] as unknown[];
      expect(params?.[1]).toBe('admin');        // $2 = role
      // $3 = fullName (null — not in this partial update, will be undefined → null via ??)
      expect(params?.[4]).toBe(true);           // $5 = isLocked
      expect(params?.[5]).toBe(3);              // $6 = failedAttempts
      expect(params?.[6]).toBeInstanceOf(Date); // $7 = lastLogin
    });
  });

  // ── Non-Error throws – String(error) branch ───────────────────────────────
  describe('Non-Error error stringification', () => {
    it('should stringify non-Error thrown from findById()', async () => {
      mockQuery.mockRejectedValueOnce('db crash' as never);
      await expect(repository.findById('id')).rejects.toBe('db crash');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find user by id',
        expect.objectContaining({ error: 'db crash' }),
      );
    });

    it('should stringify non-Error thrown from findByUsername()', async () => {
      mockQuery.mockRejectedValueOnce('crash' as never);
      await expect(repository.findByUsername('alice')).rejects.toBe('crash');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find user by username',
        expect.objectContaining({ error: 'crash' }),
      );
    });

    it('should stringify non-Error thrown from save()', async () => {
      mockQuery.mockRejectedValueOnce('crash' as never);
      await expect(repository.save(baseRecord)).rejects.toBe('crash');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save user',
        expect.objectContaining({ error: 'crash' }),
      );
    });

    it('should stringify non-Error thrown from update()', async () => {
      mockQuery.mockRejectedValueOnce('crash' as never);
      await expect(repository.update('id', {})).rejects.toBe('crash');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to update user',
        expect.objectContaining({ error: 'crash' }),
      );
    });

    it('should stringify non-Error thrown from findAll()', async () => {
      mockQuery.mockRejectedValueOnce('crash' as never);
      await expect(repository.findAll()).rejects.toBe('crash');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to list users',
        expect.objectContaining({ error: 'crash' }),
      );
    });

    it('should stringify non-Error thrown from delete()', async () => {
      mockQuery.mockRejectedValueOnce('crash' as never);
      await expect(repository.delete('id')).rejects.toBe('crash');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete user',
        expect.objectContaining({ error: 'crash' }),
      );
    });
  });
});
