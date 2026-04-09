import { RedisEventRepository } from '../../infrastructure/persistence/RedisEventRepository';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../infrastructure/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockLPush = jest.fn();
const mockLTrim = jest.fn();
const mockLRange = jest.fn();
const mockDel = jest.fn();
const mockConnect = jest.fn();
const mockQuit = jest.fn();
const mockOn = jest.fn();
const mockMulti = jest.fn();
const mockRPush = jest.fn();
const mockExec = jest.fn();
const mockKeys = jest.fn();
const mockGet = jest.fn();

let mockIsOpen = true;

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: mockConnect,
    quit: mockQuit,
    on: mockOn,
    lPush: mockLPush,
    lTrim: mockLTrim,
    lRange: mockLRange,
    del: mockDel,
    multi: mockMulti,
    keys: mockKeys,
    get: mockGet,
    get isOpen() {
      return mockIsOpen;
    },
  })),
}));

import { logger } from '../../infrastructure/logging';

describe('RedisEventRepository', () => {
  let repository: RedisEventRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new RedisEventRepository();
    mockIsOpen = true;
    mockConnect.mockResolvedValue(undefined as never);
    mockQuit.mockResolvedValue(undefined as never);
    mockLPush.mockResolvedValue(1 as never);
    mockLTrim.mockResolvedValue('OK' as never);
    mockLRange.mockResolvedValue([] as never);
    mockDel.mockResolvedValue(1 as never);
    mockKeys.mockResolvedValue([] as never);
    mockGet.mockResolvedValue(null as never);
    mockMulti.mockReturnValue({
      rPush: mockRPush,
      del: mockDel,
      exec: mockExec,
    });
    mockExec.mockResolvedValue([] as never);
    mockRPush.mockReturnValue({
      rPush: mockRPush,
      del: mockDel,
      exec: mockExec,
    });
    mockDel.mockReturnValue({
      rPush: mockRPush,
      del: mockDel,
      exec: mockExec,
    });
  });

  describe('connect', () => {
    it('should connect to redis successfully', async () => {
      await repository.connect('redis://localhost:6379');

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should register error handler on client', async () => {
      await repository.connect();

      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log info on successful connection', async () => {
      await repository.connect();

      expect(logger.info).toHaveBeenCalledWith('Redis connected');
    });

    it('should handle connection failure gracefully', async () => {
      mockConnect.mockRejectedValue(new Error('Connection refused') as never);

      await repository.connect();

      expect(logger.warn).toHaveBeenCalledWith(
        'Redis connection failed',
        { error: 'Connection refused' },
      );
    });

    it('should handle non-Error connection failure', async () => {
      mockConnect.mockRejectedValue('string error' as never);

      await repository.connect();

      expect(logger.warn).toHaveBeenCalledWith(
        'Redis connection failed',
        { error: 'Unknown error' },
      );
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should save payload to Redis list', async () => {
      const payload = { routingKey: 'test', data: {}, receivedAt: '2026-01-01T00:00:00Z' };

      await repository.save(payload);

      expect(mockLPush).toHaveBeenCalledWith(
        'cg:ws:history',
        JSON.stringify(payload),
      );
    });

    it('should trim history to MAX_HISTORY (200)', async () => {
      await repository.save({ test: true });

      expect(mockLTrim).toHaveBeenCalledWith('cg:ws:history', 0, 199);
    });

    it('should not save when client is not open', async () => {
      mockIsOpen = false;

      await repository.save({ test: true });

      expect(mockLPush).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      mockLPush.mockRejectedValue(new Error('Write failed') as never);

      await repository.save({ test: true });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save to Redis',
        { error: 'Write failed' },
      );
    });
  });

  describe('getHistory', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should return parsed history items', async () => {
      const items = [
        JSON.stringify({ routingKey: 'a', data: {}, receivedAt: '2026-01-01' }),
        JSON.stringify({ routingKey: 'b', data: {}, receivedAt: '2026-01-02' }),
      ];
      mockLRange.mockResolvedValue(items as never);

      const result = await repository.getHistory();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ routingKey: 'a', data: {}, receivedAt: '2026-01-01' });
      expect(result[1]).toEqual({ routingKey: 'b', data: {}, receivedAt: '2026-01-02' });
    });

    it('should return empty array when no history', async () => {
      mockLRange.mockResolvedValue([] as never);

      const result = await repository.getHistory();

      expect(result).toEqual([]);
    });

    it('should return empty array when client is not open', async () => {
      mockIsOpen = false;

      const result = await repository.getHistory();

      expect(result).toEqual([]);
    });

    it('should handle read errors and return empty array', async () => {
      mockLRange.mockRejectedValue(new Error('Read failed') as never);

      const result = await repository.getHistory();

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get history from Redis',
        { error: 'Read failed' },
      );
    });
  });

  describe('clearHistory', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should delete the history key', async () => {
      await repository.clearHistory();

      expect(mockDel).toHaveBeenCalledWith('cg:ws:history');
    });
  });

  describe('removeById', () => {
    beforeEach(async () => {
      await repository.connect();
    });

    it('should remove item matching eventId', async () => {
      const item1 = JSON.stringify({ eventId: 'abc', data: {} });
      const item2 = JSON.stringify({ eventId: 'def', data: {} });
      mockLRange.mockResolvedValue([item1, item2] as never);

      await repository.removeById('abc');

      expect(mockExec).toHaveBeenCalledTimes(1);
    });
  });

  describe('close', () => {
    it('should quit redis client when open', async () => {
      await repository.connect();
      await repository.close();

      expect(mockQuit).toHaveBeenCalledTimes(1);
    });
  });
});