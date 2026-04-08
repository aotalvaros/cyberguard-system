import { createClient } from 'redis';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient> | null = null;
const HISTORY_KEY = 'cg:ws:history';
const MAX_HISTORY = 200;

const getMessageId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (record['eventId'] && typeof record['eventId'] === 'string') return record['eventId'];
  const data = record['data'] as Record<string, unknown> | undefined;
  if (data?.['threatId'] && typeof data['threatId'] === 'string') return data['threatId'];
  if (record['routingKey'] && record['receivedAt']) return `${String(record['routingKey'])}::${String(record['receivedAt'])}`;
  if (record['routing'] && record['timestamp']) return `${String(record['routing'])}::${String(record['timestamp'])}`;
  
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

export const saveToRedis = async (payload: unknown): Promise<void> => {
  if (!redisClient?.isOpen) return;
  try {
    await redisClient.lPush(HISTORY_KEY, JSON.stringify(payload));
    await redisClient.lTrim(HISTORY_KEY, 0, MAX_HISTORY - 1);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to save to Redis', { error: message });
  }
};

export const getHistoryFromRedis = async (): Promise<unknown[]> => {
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
    
    let found = false;
    const remaining: string[] = [];
    for (const item of items) {
      try {
        const parsed = JSON.parse(item);
        if (getMessageId(parsed) !== id) {
          remaining.push(item);
        } else {
          found = true;
        }
      } catch {
        remaining.push(item);
      }
    }
    
    if (found) {
      
      const pipeline = redisClient.multi();
      pipeline.del(HISTORY_KEY);
      for (const item of remaining) {
        pipeline.rPush(HISTORY_KEY, item);
      }
      await pipeline.exec();
      logger.info('History item removed', { id });
    } else {
      logger.warn('History item not found', { id });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to remove history item', { error: message });
  }
};

export interface StoredNotifPreferences {
  username: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}

/**
 * Retrieves all notification preferences stored by the producer.
 * Keys follow the pattern `notif:prefs:{username}`.
 */
export const getAllNotifPreferences = async (): Promise<StoredNotifPreferences[]> => {
  if (!redisClient?.isOpen) return [];
  try {
    const keys = await redisClient.keys('notif:prefs:*');
    if (keys.length === 0) return [];

    const values = await Promise.all(keys.map((k) => redisClient!.get(k)));
    return values
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v) as StoredNotifPreferences)
      .filter((p) => p.emailEnabled || p.whatsappEnabled);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to fetch notification preferences', { error: message });
    return [];
  }
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) await redisClient.quit();
};
