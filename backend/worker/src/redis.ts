import { createClient } from 'redis';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient> | null = null;
const HISTORY_KEY = 'cg:ws:history';
const MAX_HISTORY = 200;

const getMessageId = (payload: any): string | null => {
  if (!payload) return null;
  if (payload.eventId && typeof payload.eventId === 'string') return payload.eventId;
  if (payload.data?.threatId && typeof payload.data.threatId === 'string') return payload.data.threatId;
  if (payload.routingKey && payload.receivedAt) return `${payload.routingKey}::${payload.receivedAt}`;
  if (payload.routing && payload.timestamp) return `${payload.routing}::${payload.timestamp}`;
  
  try {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return `hash:${hash}`;
  } catch {
    return null;
  }
};

export const connectRedis = async (url?: string): Promise<void> => {
  try {
    redisClient = createClient({ url: url || process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.on('error', (err: Error) => logger.error('Redis error', { error: err.message }));
    await redisClient.connect();
    logger.info('Redis connected');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.warn('Redis connection failed', { error: message });
    redisClient = null;
  }
};

export const saveToRedis = async (payload: any): Promise<void> => {
  if (!redisClient?.isOpen) return;
  try {
    await redisClient.lPush(HISTORY_KEY, JSON.stringify(payload));
    await redisClient.lTrim(HISTORY_KEY, 0, MAX_HISTORY - 1);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to save to Redis', { error: message });
  }
};

export const getHistoryFromRedis = async (): Promise<any[]> => {
  if (!redisClient?.isOpen) return [];
  try {
    const items = await redisClient.lRange(HISTORY_KEY, 0, MAX_HISTORY - 1);
    return items.map(item => JSON.parse(item));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to get history from Redis', { error: message });
    return [];
  }
};

export const clearHistoryFromRedis = async (): Promise<void> => {
  if (!redisClient?.isOpen) return;
  try {
    await redisClient.del(HISTORY_KEY);
    logger.info('Redis history cleared');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to clear history from Redis', { error: message });
  }
};

export const removeHistoryItemById = async (id: string): Promise<void> => {
  if (!redisClient?.isOpen) return;
  try {
    const items = await redisClient.lRange(HISTORY_KEY, 0, -1);
    const pipeline = redisClient.multi();
    
    let found = false;
    for (const item of items) {
      try {
        const parsed = JSON.parse(item);
        if (getMessageId(parsed) !== id) {
          pipeline.rPush(HISTORY_KEY, item);
        } else {
          found = true;
        }
      } catch {
        pipeline.rPush(HISTORY_KEY, item);
      }
    }
    
    if (found) {
      await pipeline.del(HISTORY_KEY).exec();
      logger.info('History item removed', { id });
    } else {
      logger.warn('History item not found', { id });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to remove history item', { error: message });
  }
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) await redisClient.quit();
};
