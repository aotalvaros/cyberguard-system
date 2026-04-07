import { Observable } from 'rxjs';
import { NotificationPreferences } from '../models/notification-preferences.model';

export abstract class NotificationPreferencesRepository {
  abstract get(): Observable<NotificationPreferences>;
  abstract save(prefs: NotificationPreferences): Observable<void>;
}
