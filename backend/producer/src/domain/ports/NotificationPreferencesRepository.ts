import type { NotificationPreferences } from '../entities/NotificationPreferences';

export interface NotificationPreferencesRepository {
  getPreferences(username: string): Promise<NotificationPreferences | null>;
  savePreferences(prefs: NotificationPreferences): Promise<void>;
}
