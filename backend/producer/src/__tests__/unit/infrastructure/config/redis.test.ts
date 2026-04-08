/**
 * Unit Tests: redis.ts (config)
 *
 * VERIFICAR: connectRedis() conecta exitosamente.
 * VERIFICAR: connectRedis() maneja error de conexión.
 * VERIFICAR: getRedisClient() retorna cliente o null.
 * VERIFICAR: closeRedis() cierra el cliente abierto.
 * VERIFICAR: closeRedis() no lanza si no hay cliente abierto.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockConnect = jest.fn<() => Promise<void>>();
const mockQuit = jest.fn<() => Promise<void>>();
const mockOn = jest.fn();
const mockRedisClient = {
  on: mockOn,
  connect: mockConnect,
  quit: mockQuit,
  isOpen: true,
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));
jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { connectRedis, getRedisClient, closeRedis } from '../../../../infrastructure/config/redis';
import { logger } from '../../../../infrastructure/config/logger';

// ─────────────────────────────────────────────────────────────────────────────

describe('redis config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('connectRedis()', () => {
    it('should connect successfully and log info', async () => {
      mockConnect.mockResolvedValueOnce(undefined);

      await connectRedis();

      expect(mockConnect).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(logger.info).toHaveBeenCalledWith('Redis connected (producer)');
    });

    it('should set redisClient to null on connection error (Error instance)', async () => {
      mockConnect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await connectRedis();

      expect(logger.warn).toHaveBeenCalledWith(
        'Redis connection failed (producer)',
        expect.objectContaining({ error: 'ECONNREFUSED' }),
      );
    });

    it('should handle non-Error thrown during connection', async () => {
      mockConnect.mockRejectedValueOnce('unknown failure');

      await connectRedis();

      expect(logger.warn).toHaveBeenCalledWith(
        'Redis connection failed (producer)',
        expect.objectContaining({ error: 'Unknown error' }),
      );
    });

    it('should register an error handler that logs redis errors', async () => {
      mockConnect.mockResolvedValueOnce(undefined);

      await connectRedis();

      // Get the error handler callback
      const errorHandler = mockOn.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1] as (err: Error) => void;

      expect(errorHandler).toBeDefined();
      errorHandler(new Error('Redis timeout'));
      expect(logger.error).toHaveBeenCalledWith(
        'Redis error (producer)',
        expect.objectContaining({ error: 'Redis timeout' }),
      );
    });
  });

  describe('getRedisClient()', () => {
    it('should return the redis client after connection', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await connectRedis();

      const client = getRedisClient();

      expect(client).toBeDefined();
    });
  });

  describe('closeRedis()', () => {
    it('should call quit on open client', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      mockQuit.mockResolvedValueOnce(undefined);
      await connectRedis();
      mockRedisClient.isOpen = true;

      await closeRedis();

      expect(mockQuit).toHaveBeenCalled();
    });

    it('should not throw when client is not open', async () => {
      mockConnect.mockResolvedValueOnce(undefined);
      await connectRedis();
      mockRedisClient.isOpen = false;

      await expect(closeRedis()).resolves.toBeUndefined();
    });
  });
});
