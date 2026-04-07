import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationPreferencesRepository } from '../../domain/ports/notification-preferences.repository';
import { NotificationPreferences } from '../../domain/models/notification-preferences.model';

@Injectable({ providedIn: 'root' })
export class GetNotificationPreferencesUseCase {
  private readonly repo = inject(NotificationPreferencesRepository);

  execute(): Observable<NotificationPreferences> {
    return this.repo.get();
  }
}
