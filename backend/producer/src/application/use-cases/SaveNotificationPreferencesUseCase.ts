import type { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';
import type { NotificationPreferences } from '../../domain/entities/NotificationPreferences';

export class SaveNotificationPreferencesUseCase {
  constructor(private readonly repo: NotificationPreferencesRepository) {}

  async execute(prefs: NotificationPreferences): Promise<void> {
    await this.repo.savePreferences(prefs);
  }
}
