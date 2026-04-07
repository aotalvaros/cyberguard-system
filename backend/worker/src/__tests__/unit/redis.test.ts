import {
  connectRedis,
  saveToRedis,
  getHistoryFromRedis,
  clearHistoryFromRedis,
  removeHistoryItemById,
  closeRedis,
} from '../../redis';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockLPush = jest.fn();
const mockLTrim = jest.fn();
const mockLRange = jest.fn()
const mockDel = jest.fn();
const mockConnect = jest.fn();
const mockQuit = jest.fn();
const mockOn = jest.fn();
const mockMulti = jest.fn();
const mockRPush = jest.fn();
const mockExec = jest.fn();

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
    get isOpen() {
      return mockIsOpen;
    },
  })),
}));

import { logger } from '../../logger';

describe('Redis Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOpen = true;
    mockConnect.mockResolvedValue(undefined as never);
    mockQuit.mockResolvedValue(undefined as never);
    mockLPush.mockResolvedValue(1 as never);
    mockLTrim.mockResolvedValue('OK' as never);
    mockLRange.mockResolvedValue([] as never);
    mockDel.mockResolvedValue(1 as never);
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

  
  
  

  describe('connectRedis', () => {
    it('should connect to redis successfully', async () => {
      await connectRedis('redis://localhost:6379');

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should register error handler on client', async () => {
      await connectRedis();

      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should log info on successful connection', async () => {

      await connectRedis();

      expect(logger.info).toHaveBeenCalledWith('Redis connected');
    });

    it('should handle connection failure gracefully', async () => {
      mockConnect.mockRejectedValue(new Error('Connection refused') as never);

      await connectRedis();

      expect(logger.warn).toHaveBeenCalledWith(
        'Redis connection failed',
        { error: 'Connection refused' },
      );
    });

    it('should handle non-Error connection failure', async () => {
      mockConnect.mockRejectedValue('string error' as never);

      await connectRedis();

      expect(logger.warn).toHaveBeenCalledWith(
        'Redis connection failed',
        { error: 'Unknown error' },
      );
    });
  });

  
  
  

  describe('saveToRedis', () => {
    beforeEach(async () => {
      await connectRedis();
    });

    it('should save payload to Redis list', async () => {
      const payload = { routingKey: 'test', data: {}, receivedAt: '2026-01-01T00:00:00Z' };

      await saveToRedis(payload);

      expect(mockLPush).toHaveBeenCalledWith(
        'cg:ws:history',
        JSON.stringify(payload),
      );
    });

    it('should trim history to MAX_HISTORY (200)', async () => {
      await saveToRedis({ test: true });

      expect(mockLTrim).toHaveBeenCalledWith('cg:ws:history', 0, 199);
    });

    it('should not save when client is not open', async () => {
      mockIsOpen = false;

      await saveToRedis({ test: true });

      expect(mockLPush).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      mockLPush.mockRejectedValue(new Error('Write failed') as never);

      await saveToRedis({ test: true });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save to Redis',
        { error: 'Write failed' },
      );
    });

    it('should handle non-Error save failures', async () => {
      mockLPush.mockRejectedValue(42 as never);

      await saveToRedis({ test: true });

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save to Redis',
        { error: 'Unknown error' },
      );
    });
  });

  
  
  

  describe('getHistoryFromRedis', () => {
    beforeEach(async () => {
      await connectRedis();
    });

    it('should return parsed history items', async () => {
      const items = [
        JSON.stringify({ routingKey: 'a', data: {}, receivedAt: '2026-01-01' }),
        JSON.stringify({ routingKey: 'b', data: {}, receivedAt: '2026-01-02' }),
      ];
      mockLRange.mockResolvedValue(items as never);

      const result = await getHistoryFromRedis();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ routingKey: 'a', data: {}, receivedAt: '2026-01-01' });
      expect(result[1]).toEqual({ routingKey: 'b', data: {}, receivedAt: '2026-01-02' });
    });

    it('should return empty array when no history', async () => {
      mockLRange.mockResolvedValue([] as never);

      const result = await getHistoryFromRedis();

      expect(result).toEqual([]);
    });

    it('should return empty array when client is not open', async () => {
      mockIsOpen = false;

      const result = await getHistoryFromRedis();

      expect(result).toEqual([]);
    });

    it('should handle read errors and return empty array', async () => {
      mockLRange.mockRejectedValue(new Error('Read failed') as never);

      const result = await getHistoryFromRedis();

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get history from Redis',
        { error: 'Read failed' },
      );
    });

    it('should request up to MAX_HISTORY items', async () => {
      mockLRange.mockResolvedValue([] as never);

      await getHistoryFromRedis();

      expect(mockLRange).toHaveBeenCalledWith('cg:ws:history', 0, 199);
    });
  });

  
  
  

  describe('clearHistoryFromRedis', () => {
    beforeEach(async () => {
      await connectRedis();
    });

    it('should delete the history key', async () => {
      await clearHistoryFromRedis();

      expect(mockDel).toHaveBeenCalledWith('cg:ws:history');
    });

    it('should log success message', async () => {

      await clearHistoryFromRedis();

      expect(logger.info).toHaveBeenCalledWith('Redis history cleared');
    });

    it('should not clear when client is not open', async () => {
      mockIsOpen = false;

      await clearHistoryFromRedis();

      expect(mockDel).not.toHaveBeenCalled();
    });

    it('should handle clear errors gracefully', async () => {
      mockDel.mockRejectedValue(new Error('Delete failed') as never);

      await clearHistoryFromRedis();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to clear history from Redis',
        { error: 'Delete failed' },
      );
    });
  });

  
  
  

  describe('removeHistoryItemById', () => {
    beforeEach(async () => {
      await connectRedis();
    });

    it('should remove item matching eventId', async () => {
      const item1 = JSON.stringify({ eventId: 'abc', data: {} });
      const item2 = JSON.stringify({ eventId: 'def', data: {} });
      mockLRange.mockResolvedValue([item1, item2] as never);

      await removeHistoryItemById('abc');

      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should remove item matching data.threatId', async () => {
      const item = JSON.stringify({ data: { threatId: 'threat-1' } });
      mockLRange.mockResolvedValue([item] as never);

      await removeHistoryItemById('threat-1');

      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should remove item matching routingKey::receivedAt', async () => {
      const item = JSON.stringify({ routingKey: 'test', receivedAt: '2026-01-01' });
      mockLRange.mockResolvedValue([item] as never);

      await removeHistoryItemById('test::2026-01-01');

      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should log warning when item not found', async () => {
      mockLRange.mockResolvedValue([] as never);

      await removeHistoryItemById('nonexistent');

      expect(logger.warn).toHaveBeenCalledWith(
        'History item not found',
        { id: 'nonexistent' },
      );
    });

    it('should not remove when client is not open', async () => {
      mockIsOpen = false;

      await removeHistoryItemById('abc');

      expect(mockLRange).not.toHaveBeenCalled();
    });

    it('should handle removal errors gracefully', async () => {
      mockLRange.mockRejectedValue(new Error('Read error') as never);

      await removeHistoryItemById('abc');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to remove history item',
        { error: 'Read error' },
      );
    });
  });

  
  
  

  describe('closeRedis', () => {
    it('should quit redis client when open', async () => {
      await connectRedis();

      await closeRedis();

      expect(mockQuit).toHaveBeenCalledTimes(1);
    });

    it('should not quit when client is not open', async () => {
      await connectRedis();
      mockIsOpen = false;

      await closeRedis();

      expect(mockQuit).not.toHaveBeenCalled();
    });
  });
});
