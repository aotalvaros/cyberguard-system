import { createClient } from 'redis';
import { logger } from '../../src/config/logger';

let redisClient: ReturnType<typeof createClient> | null = null;
const HISTORY_KEY = 'cg:ws:history';
const MAX_HISTORY = 200;

export async function connectRedis(url?: string) {
  try {
    redisClient = createClient({ url: url || process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.on('error', (err) => logger.error('Redis error', { error: err?.message }));
    await redisClient.connect();
    logger.info('Redis connected');
  } catch (err: any) {
    logger.warn('Redis connection failed, continuing without persistence', { error: err?.message });
    redisClient = null;
  }
}

export async function saveToRedis(payload: any) {
  if (!redisClient?.isOpen) return;
  try {
    await redisClient.lPush(HISTORY_KEY, JSON.stringify(payload));
    await redisClient.lTrim(HISTORY_KEY, 0, MAX_HISTORY - 1);
  } catch (err: any) {
    logger.error('Failed to save to Redis', { error: err?.message });
  }
}

export async function getHistoryFromRedis(): Promise<any[]> {
  if (!redisClient?.isOpen) return [];
  try {
    const items = await redisClient.lRange(HISTORY_KEY, 0, MAX_HISTORY - 1);
    return items.map(item => JSON.parse(item));
  } catch (err: any) {
    logger.error('Failed to get history from Redis', { error: err?.message });
    return [];
  }
}

export async function closeRedis() {
  if (redisClient?.isOpen) await redisClient.quit();
}
