/**
 * Unit Tests: RedisNotificationPreferencesRepository
 *
 * VERIFICAR: getPreferences retorna datos parseados cuando existen en Redis.
 * VERIFICAR: getPreferences retorna null cuando no hay datos.
 * VERIFICAR: getPreferences retorna null cuando Redis client no está abierto.
 * VERIFICAR: getPreferences retorna null y loguea en caso de error.
 * VERIFICAR: savePreferences guarda las preferencias serializadas.
 * VERIFICAR: savePreferences lanza error cuando Redis no está disponible.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockGet = jest.fn<(...args: unknown[]) => Promise<string | null>>();
const mockSet = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockClient = {
  isOpen: true,
  get: mockGet,
  set: mockSet,
};

jest.mock('../../../../infrastructure/config/redis', () => ({
  getRedisClient: jest.fn(() => mockClient),
}));
jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { RedisNotificationPreferencesRepository } from '../../../../infrastructure/persistence/RedisNotificationPreferencesRepository';
import { getRedisClient } from '../../../../infrastructure/config/redis';
import { logger } from '../../../../infrastructure/config/logger';

const mockGetRedisClient = getRedisClient as jest.MockedFunction<typeof getRedisClient>;

// ─────────────────────────────────────────────────────────────────────────────

describe('RedisNotificationPreferencesRepository', () => {
  let repo: RedisNotificationPreferencesRepository;

  beforeEach(() => {
    repo = new RedisNotificationPreferencesRepository();
    jest.clearAllMocks();
    mockClient.isOpen = true;
    mockGetRedisClient.mockReturnValue(mockClient as never);
  });

  // ── getPreferences ──────────────────────────────────────────────────────
  describe('getPreferences()', () => {
    it('should return parsed preferences when data exists', async () => {
      const prefs = {
        username: 'admin',
        emailEnabled: true,
        whatsappEnabled: false,
        email: 'admin@test.com',
        phone: '',
      };
      mockGet.mockResolvedValueOnce(JSON.stringify(prefs));

      const result = await repo.getPreferences('admin');

      expect(result).toEqual(prefs);
      expect(mockGet).toHaveBeenCalledWith('notif:prefs:admin');
    });

    it('should return null when no data exists in Redis', async () => {
      mockGet.mockResolvedValueOnce(null);

      const result = await repo.getPreferences('admin');

      expect(result).toBeNull();
    });

    it('should return null when Redis client is not open', async () => {
      mockClient.isOpen = false;

      const result = await repo.getPreferences('admin');

      expect(result).toBeNull();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return null when Redis client is null', async () => {
      mockGetRedisClient.mockReturnValue(null as never);

      const result = await repo.getPreferences('admin');

      expect(result).toBeNull();
    });

    it('should return null and log error on exception', async () => {
      mockGet.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await repo.getPreferences('admin');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        'RedisNotifPrefsRepo: getPreferences failed',
        expect.objectContaining({ error: 'Connection lost' }),
      );
    });
  });

  // ── savePreferences ─────────────────────────────────────────────────────
  describe('savePreferences()', () => {
    it('should save serialized preferences to Redis', async () => {
      mockSet.mockResolvedValueOnce('OK');
      const prefs = {
        username: 'admin',
        emailEnabled: true,
        whatsappEnabled: false,
        email: 'admin@test.com',
        phone: '',
      };

      await repo.savePreferences(prefs);

      expect(mockSet).toHaveBeenCalledWith(
        'notif:prefs:admin',
        JSON.stringify(prefs),
      );
    });

    it('should throw when Redis client is not open', async () => {
      mockClient.isOpen = false;
      const prefs = {
        username: 'admin',
        emailEnabled: true,
        whatsappEnabled: false,
        email: 'admin@test.com',
        phone: '',
      };

      await expect(repo.savePreferences(prefs)).rejects.toThrow('Redis not available');
    });

    it('should throw when Redis client is null', async () => {
      mockGetRedisClient.mockReturnValue(null as never);
      const prefs = {
        username: 'admin',
        emailEnabled: true,
        whatsappEnabled: false,
        email: 'admin@test.com',
        phone: '',
      };

      await expect(repo.savePreferences(prefs)).rejects.toThrow('Redis not available');
    });
  });
});
