/**
 * Unit Tests: database.ts
 *
 * VERIFICAR: query() llama pool.query y retorna las filas correctamente.
 * VERIFICAR: getPool() retorna la instancia del pool.
 * VERIFICAR: closePool() cierra el pool y loguea.
 * VALIDAR:   query() propaga errores sin silenciarlos.
 * VALIDAR:   pool error handler loguea errores inesperados del pool.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ── Mocks deben declararse ANTES del import del módulo bajo test ──────────────
type AsyncFn = (...args: unknown[]) => Promise<unknown>;

const mockPoolQuery = jest.fn<AsyncFn>();
const mockPoolEnd   = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
const mockPoolOn    = jest.fn<(event: string, cb: unknown) => void>();

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: mockPoolQuery,
    end:   mockPoolEnd,
    on:    mockPoolOn,
  })),
}));

const mockLogger = {
  error: jest.fn(),
  debug: jest.fn(),
  info:  jest.fn(),
  warn:  jest.fn(),
};
jest.mock('../../../../infrastructure/config/logger', () => ({ logger: mockLogger }));

import { query, getPool, closePool } from '../../../../infrastructure/config/database';

// ─────────────────────────────────────────────────────────────────────────────

describe('database.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getPool ─────────────────────────────────────────────────────────────────
  describe('getPool()', () => {
    it('should return the pool instance', () => {
      const pool = getPool();
      expect(pool).toBeDefined();
      expect(typeof pool.query).toBe('function');
    });

    it('should return the same pool instance on repeated calls', () => {
      const pool1 = getPool();
      const pool2 = getPool();
      expect(pool1).toBe(pool2);
    });
  });

  // ── query ───────────────────────────────────────────────────────────────────
  describe('query()', () => {
    it('should call pool.query with the given SQL text and params', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await query('SELECT 1 WHERE id = $1', ['abc']);

      expect(mockPoolQuery).toHaveBeenCalledWith('SELECT 1 WHERE id = $1', ['abc']);
    });

    it('should call pool.query with text only when params are omitted', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await query('SELECT 1');

      expect(mockPoolQuery).toHaveBeenCalledWith('SELECT 1', undefined);
    });

    it('should return the rows from the query result', async () => {
      const expectedRows = [{ id: '1', name: 'test' }, { id: '2', name: 'other' }];
      mockPoolQuery.mockResolvedValueOnce({ rows: expectedRows, rowCount: 2 });

      const result = await query('SELECT * FROM threats');

      expect(result).toEqual(expectedRows);
    });

    it('should return an empty array when no rows match', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await query('SELECT * FROM threats WHERE id = $1', ['nonexistent']);

      expect(result).toEqual([]);
    });

    it('should log a debug entry after successful query execution', async () => {
      mockPoolQuery.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });

      await query('SELECT COUNT(*) FROM threats');

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'SQL query executed',
        expect.objectContaining({
          text:     'SELECT COUNT(*) FROM threats',
          duration: expect.any(Number),
          rows:     1,
        }),
      );
    });

    it('should truncate long SQL text to 100 chars in the debug log', async () => {
      const longSql = 'SELECT ' + 'a, '.repeat(50) + 'id FROM threats';
      mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await query(longSql);

      const logged = mockLogger.debug.mock.calls[0]?.[1] as { text: string };
      expect(logged.text.length).toBeLessThanOrEqual(100);
    });

    it('should propagate database errors without catching them', async () => {
      const dbError = new Error('Connection refused');
      mockPoolQuery.mockRejectedValueOnce(dbError);

      await expect(query('SELECT 1')).rejects.toThrow('Connection refused');
    });
  });

  // ── closePool ───────────────────────────────────────────────────────────────
  describe('closePool()', () => {
    it('should call pool.end() to close all connections', async () => {
      await closePool();

      expect(mockPoolEnd).toHaveBeenCalledTimes(1);
    });

    it('should log info when pool is closed', async () => {
      await closePool();

      expect(mockLogger.info).toHaveBeenCalledWith('PostgreSQL pool closed');
    });
  });

  // ── pool error handler ───────────────────────────────────────────────────────
  describe('pool.on("error") handler', () => {
    // Capture BEFORE beforeEach runs clearAllMocks() which wipes call records.
    // pool.on('error', cb) is called once at module load time.
    const capturedErrorHandler = mockPoolOn.mock.calls.find(
      (c) => c[0] === 'error'
    )?.[1] as ((err: Error) => void) | undefined;

    it('should register an error handler on the pool at module load', () => {
      expect(capturedErrorHandler).toBeDefined();
    });

    it('should log unexpected pool errors using the error handler', () => {
      expect(capturedErrorHandler).toBeDefined();
      capturedErrorHandler!(new Error('unexpected pool crash'));
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected PostgreSQL pool error',
        { error: 'unexpected pool crash' },
      );
    });
  });
});
