import { createClient } from 'redis';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient> | null = null;
const HISTORY_KEY = 'cg:ws:history';
const MAX_HISTORY = 200;

function getMessageId(payload: any): string | null {
  if (!payload) return null;
  if (payload.eventId && typeof payload.eventId === 'string') return payload.eventId;
  if (payload.data && payload.data.threatId && typeof payload.data.threatId === 'string') return payload.data.threatId;
  if (payload.routingKey && payload.receivedAt) return `${payload.routingKey}::${payload.receivedAt}`;
  if (payload.routing && payload.timestamp) return `${payload.routing}::${payload.timestamp}`;
  try {
    const s = JSON.stringify(payload);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return `hash:${h}`;
  } catch {
    return null;
  }
}

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
    return items.map((item: any) => JSON.parse(item));
  } catch (err: any) {
    logger.error('Failed to get history from Redis', { error: err?.message });
    return [];
  }
}

export async function clearHistoryFromRedis() {
  if (!redisClient?.isOpen) return;
  try {
    await redisClient.del(HISTORY_KEY);
    logger.info('Redis history cleared');
  } catch (err: any) {
    logger.error('Failed to clear history from Redis', { error: err?.message });
  }
}

export async function removeHistoryItemById(id: string) {
  if (!redisClient?.isOpen) return;
  try {
    const items = await redisClient.lRange(HISTORY_KEY, 0, MAX_HISTORY - 1);
    const parsed = items.map((item: any) => {
      try { return JSON.parse(item); } catch { return null; }
    }).filter(Boolean);

    const filtered = parsed.filter((item: any) => getMessageId(item) !== id);
    await redisClient.del(HISTORY_KEY);
    if (filtered.length > 0) {
      await redisClient.rPush(HISTORY_KEY, filtered.map((item: any) => JSON.stringify(item)));
    }
  } catch (err: any) {
    logger.error('Failed to remove history item', { error: err?.message });
  }
}

export async function closeRedis() {
  if (redisClient?.isOpen) await redisClient.quit();
}
