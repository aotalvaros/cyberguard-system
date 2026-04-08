import { createClient } from 'redis';
import { logger } from './logger';

let redisClient: ReturnType<typeof createClient> | null = null;

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.on('error', (err: Error) => logger.error('Redis error (producer)', { error: err.message }));
    await redisClient.connect();
    logger.info('Redis connected (producer)');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.warn('Redis connection failed (producer)', { error: message });
    redisClient = null;
  }
};

export const getRedisClient = (): ReturnType<typeof createClient> | null => redisClient;

export const closeRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) await redisClient.quit();
};
