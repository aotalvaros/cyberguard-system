/**
 * Unit Tests: PostgresAuditLogRepository
 *
 * VERIFICAR: log() ejecuta el INSERT con los campos correctos.
 * VERIFICAR: log() pasa null para campos opcionales ausentes.
 * VALIDAR:   log() propaga errores sin silenciarlos.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const mockQuery = jest.fn<AsyncFn>();
jest.mock('../../../../infrastructure/config/database', () => ({ query: mockQuery }));
jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { PostgresAuditLogRepository } from '../../../../infrastructure/persistence/PostgresAuditLogRepository';
import type { AuditLogEntry } from '../../../../domain/ports/AuditLogRepository';
import { logger } from '../../../../infrastructure/config/logger';

// ─────────────────────────────────────────────────────────────────────────────

const baseEntry: AuditLogEntry = {
  userId:    'user-123',
  action:    'LOGIN',
  status:    'success',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0',
  details:   { method: 'firebase' },
};

describe('PostgresAuditLogRepository', () => {
  let repository: PostgresAuditLogRepository;

  beforeEach(() => {
    repository = new PostgresAuditLogRepository();
    jest.clearAllMocks();
  });

  describe('log()', () => {
    it('should execute an INSERT query with all fields', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repository.log(baseEntry);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining([
          'user-123',
          'LOGIN',
          'success',
          '192.168.1.1',
          'Mozilla/5.0',
          JSON.stringify({ method: 'firebase' }),
        ]),
      );
    });

    it('should pass null for userId when not provided', async () => {
      mockQuery.mockResolvedValueOnce([]);
      const entry: AuditLogEntry = { ...baseEntry, userId: undefined };

      await repository.log(entry);

      const params = mockQuery.mock.calls[0]?.[1] as unknown[];
      expect(params?.[0]).toBeNull(); // userId is first param
    });

    it('should pass null for ipAddress when not provided', async () => {
      mockQuery.mockResolvedValueOnce([]);
      const entry: AuditLogEntry = { ...baseEntry, ipAddress: undefined };

      await repository.log(entry);

      const params = mockQuery.mock.calls[0]?.[1] as unknown[];
      expect(params?.[3]).toBeNull(); // ipAddress is 4th param
    });

    it('should pass null for userAgent when not provided', async () => {
      mockQuery.mockResolvedValueOnce([]);
      const entry: AuditLogEntry = { ...baseEntry, userAgent: undefined };

      await repository.log(entry);

      const params = mockQuery.mock.calls[0]?.[1] as unknown[];
      expect(params?.[4]).toBeNull(); // userAgent is 5th param
    });

    it('should pass null for details when not provided', async () => {
      mockQuery.mockResolvedValueOnce([]);
      const entry: AuditLogEntry = { ...baseEntry, details: undefined };

      await repository.log(entry);

      const params = mockQuery.mock.calls[0]?.[1] as unknown[];
      expect(params?.[5]).toBeNull(); // details is 6th param
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('connection lost');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.log(baseEntry)).rejects.toThrow('connection lost');
    });

    it('should log error details on failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('insert failed'));

      await expect(repository.log(baseEntry)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to write audit log',
        expect.objectContaining({ action: 'LOGIN', error: 'insert failed' }),
      );
    });

    it('should handle non-Error thrown values and convert to string', async () => {
      mockQuery.mockRejectedValueOnce('timeout');

      await expect(repository.log(baseEntry)).rejects.toBe('timeout');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to write audit log',
        expect.objectContaining({ error: 'timeout' }),
      );
    });
  });
});
