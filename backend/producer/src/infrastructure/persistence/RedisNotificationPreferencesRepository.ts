import type { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';
import type { NotificationPreferences } from '../../domain/entities/NotificationPreferences';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

export class RedisNotificationPreferencesRepository implements NotificationPreferencesRepository {
  private key(username: string): string {
    return `notif:prefs:${username}`;
  }

  async getPreferences(username: string): Promise<NotificationPreferences | null> {
    const client = getRedisClient();
    if (!client?.isOpen) return null;
    try {
      const raw = await client.get(this.key(username));
      return raw ? (JSON.parse(raw) as NotificationPreferences) : null;
    } catch (err: unknown) {
      logger.error('RedisNotifPrefsRepo: getPreferences failed', {
        error: (err as Error).message,
      });
      return null;
    }
  }

  async savePreferences(prefs: NotificationPreferences): Promise<void> {
    const client = getRedisClient();
    if (!client?.isOpen) throw new Error('Redis not available');
    await client.set(this.key(prefs.username), JSON.stringify(prefs));
  }
}
