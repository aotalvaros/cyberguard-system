import type { INotificationService, NotifPayload, NotifResult } from './notification.types';
import { logger } from '../logger';

export interface NotifPreferences {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}

export class NotificationOrchestrator {
  constructor(
    private readonly emailService: INotificationService,
    private readonly whatsappService: INotificationService,
  ) {}

  async dispatch(payload: NotifPayload, prefs: NotifPreferences): Promise<NotifResult[]> {
    const tasks: Promise<NotifResult>[] = [];

    if (prefs.emailEnabled && prefs.email) {
      tasks.push(
        this.emailService
          .send({ ...payload, recipientEmail: prefs.email })
          .catch((err: unknown) => {
            const error = err instanceof Error ? err.message : String(err);
            logger.error('EmailAdapter unexpected throw', { eventId: payload.eventId, error });
            return {
              canal: 'email' as const,
              status: 'error' as const,
              attempts: 0,
              error,
            };
          }),
      );
    }

    if (prefs.whatsappEnabled && prefs.phone) {
      tasks.push(
        this.whatsappService
          .send({ ...payload, recipientPhone: prefs.phone })
          .catch((err: unknown) => {
            const error = err instanceof Error ? err.message : String(err);
            logger.error('WhatsAppAdapter unexpected throw', { eventId: payload.eventId, error });
            return {
              canal: 'whatsapp' as const,
              status: 'error' as const,
              attempts: 0,
              error,
            };
          }),
      );
    }

    if (tasks.length === 0) return [];

    const settled = await Promise.allSettled(tasks);

    return settled.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { canal: 'email' as const, status: 'error' as const, attempts: 0, error: 'Promise rejected' },
    );
  }
}
