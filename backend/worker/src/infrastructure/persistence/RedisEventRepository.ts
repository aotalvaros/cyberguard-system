import { createClient } from 'redis';
import type { IEventRepository, StoredNotifPreferences } from '../../domain/ports/IEventRepository';
import { logger } from '../logging';

const HISTORY_KEY = 'cg:ws:history';
const MAX_HISTORY = 200;

/**
 * Adaptador Redis.
 * Implementa IEventRepository usando redis node client.
 * Patrón: Repository + Queue-Based Load Leveling (historial con LPUSH/LTRIM).
 */
export class RedisEventRepository implements IEventRepository {
  private client: ReturnType<typeof createClient> | null = null;

  async connect(url?: string): Promise<void> {
    try {
      this.client = createClient({ url: url || process.env.REDIS_URL || 'redis://localhost:6379' });
      this.client.on('error', (err: Error) => logger.error('Redis error', { error: err.message }));
      await this.client.connect();
      logger.info('Redis connected');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.warn('Redis connection failed', { error: message });
      this.client = null;
    }
  }

  async close(): Promise<void> {
    if (this.client?.isOpen) await this.client.quit();
  }

  async save(payload: unknown): Promise<void> {
    if (!this.client?.isOpen) return;
    try {
      await this.client.lPush(HISTORY_KEY, JSON.stringify(payload));
      await this.client.lTrim(HISTORY_KEY, 0, MAX_HISTORY - 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to save to Redis', { error: message });
    }
  }

  async getHistory(): Promise<unknown[]> {
    if (!this.client?.isOpen) return [];
    try {
      const items = await this.client.lRange(HISTORY_KEY, 0, MAX_HISTORY - 1);
      return items.map(item => JSON.parse(item));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to get history from Redis', { error: message });
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    if (!this.client?.isOpen) return;
    try {
      await this.client.del(HISTORY_KEY);
      logger.info('Redis history cleared');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to clear history from Redis', { error: message });
    }
  }

  async removeById(id: string): Promise<void> {
    if (!this.client?.isOpen) return;
    try {
      const items = await this.client.lRange(HISTORY_KEY, 0, -1);
      let found = false;
      const remaining: string[] = [];

      for (const item of items) {
        try {
          const parsed = JSON.parse(item);
          if (this.getMessageId(parsed) !== id) {
            remaining.push(item);
          } else {
            found = true;
          }
        } catch {
          remaining.push(item);
        }
      }

      if (found) {
        const pipeline = this.client.multi();
        pipeline.del(HISTORY_KEY);
        for (const item of remaining) pipeline.rPush(HISTORY_KEY, item);
        await pipeline.exec();
        logger.info('History item removed', { id });
      } else {
        logger.warn('History item not found', { id });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to remove history item', { error: message });
    }
  }

  async removeByThreatId(threatId: string): Promise<void> {
    if (!this.client?.isOpen) return;
    try {
      const items = await this.client.lRange(HISTORY_KEY, 0, -1);
      let found = false;
      const remaining: string[] = [];

      for (const item of items) {
        try {
          const parsed = JSON.parse(item);
          if (this.extractThreatId(parsed) === threatId) {
            found = true;
          } else {
            remaining.push(item);
          }
        } catch {
          remaining.push(item);
        }
      }

      if (found) {
        const pipeline = this.client.multi();
        pipeline.del(HISTORY_KEY);
        for (const r of remaining) pipeline.rPush(HISTORY_KEY, r);
        await pipeline.exec();
        logger.info('History item removed by threatId', { threatId });
      } else {
        logger.warn('History item not found by threatId', { threatId });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to remove history item by threatId', { error: message });
    }
  }

  async getAllNotifPreferences(): Promise<StoredNotifPreferences[]> {
    if (!this.client?.isOpen) return [];
    try {
      const keys = await this.client.keys('notif:prefs:*');
      if (keys.length === 0) return [];

      const values = await Promise.all(keys.map((k) => this.client!.get(k)));
      return values
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v) as StoredNotifPreferences)
        .filter((p) => p.emailEnabled || p.whatsappEnabled);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to fetch notification preferences', { error: message });
      return [];
    }
  }

  // ─── helpers privados ────────────────────────────────────────────────────────

  private getMessageId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;
    const record = payload as Record<string, unknown>;
    if (typeof record['eventId'] === 'string') return record['eventId'];
    const data = record['data'] as Record<string, unknown> | undefined;
    if (data?.['eventId'] && typeof data['eventId'] === 'string') return data['eventId'];
    if (data?.['threatId'] && typeof data['threatId'] === 'string') return data['threatId'];
    const inner = data?.['data'] as Record<string, unknown> | undefined;
    if (inner?.['threatId'] && typeof inner['threatId'] === 'string') return inner['threatId'];
    if (record['routingKey'] && record['receivedAt']) return `${String(record['routingKey'])}::${String(record['receivedAt'])}`;
    try {
      const str = JSON.stringify(payload);
      let hash = 0;
      for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
      return `hash:${hash}`;
    } catch { return null; }
  }

  private extractThreatId(parsed: unknown): string | null {
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as Record<string, unknown>;
    if (typeof record['threatId'] === 'string') return record['threatId'];
    const data = record['data'] as Record<string, unknown> | undefined;
    if (data && typeof data['threatId'] === 'string') return data['threatId'];
    const inner = data?.['data'] as Record<string, unknown> | undefined;
    if (inner && typeof inner['threatId'] === 'string') return inner['threatId'];
    return null;
  }
}
