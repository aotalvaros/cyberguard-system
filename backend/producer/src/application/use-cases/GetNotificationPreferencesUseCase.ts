import type { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';
import type { NotificationPreferences } from '../../domain/entities/NotificationPreferences';
import { DEFAULT_PREFERENCES } from '../../domain/entities/NotificationPreferences';

export class GetNotificationPreferencesUseCase {
  constructor(private readonly repo: NotificationPreferencesRepository) {}

  async execute({ username }: { username: string }): Promise<NotificationPreferences> {
    const prefs = await this.repo.getPreferences(username);
    return prefs ?? DEFAULT_PREFERENCES(username);
  }
}
