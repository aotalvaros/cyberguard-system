import type { NotifPayload, NotifResult } from './INotificationService';
import type { StoredNotifPreferences } from './IEventRepository';

/**
 * Puerto del orquestador de notificaciones.
 * Implementado por NotificationOrchestrator en infrastructure/notifications/.
 */
export interface INotificationOrchestrator {
  dispatch(payload: NotifPayload, prefs: StoredNotifPreferences): Promise<NotifResult[]>;
}
