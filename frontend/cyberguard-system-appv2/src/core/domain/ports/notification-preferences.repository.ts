import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationPreferences } from '../models/notification-preferences.model';

@Injectable()
export abstract class NotificationPreferencesRepository {
  abstract get(): Observable<NotificationPreferences>;
  abstract save(prefs: NotificationPreferences): Observable<void>;
}
