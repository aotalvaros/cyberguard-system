import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NotificationPreferencesRepository } from '../../domain/ports/notification-preferences.repository';
import { NotificationPreferences } from '../../domain/models/notification-preferences.model';
import { environment } from '@environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesRepositoryImpl extends NotificationPreferencesRepository {
  private readonly http = inject(HttpClient);
  private readonly URL = `${environment.apiUrl}/api/profile/notification-preferences`;

  get(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(this.URL);
  }

  save(prefs: NotificationPreferences): Observable<void> {
    return this.http.put<void>(this.URL, prefs);
  }
}
