import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationPreferencesRepository } from '../../domain/ports/notification-preferences.repository';
import { NotificationPreferences } from '../../domain/models/notification-preferences.model';

@Injectable({ providedIn: 'root' })
export class SaveNotificationPreferencesUseCase {
  private readonly repo = inject(NotificationPreferencesRepository);

  execute(prefs: NotificationPreferences): Observable<void> {
    return this.repo.save(prefs);
  }
}
