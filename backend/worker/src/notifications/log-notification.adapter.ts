import { logger } from '../logger';
import type { INotificationService, NotifPayload, NotifResult } from './notification.types';

/**
 * Fallback adapter that logs notifications instead of sending them.
 * Used when no real API keys (SendGrid / WhatsApp) are configured.
 */
export class LogNotificationAdapter implements INotificationService {
  constructor(private readonly canal: 'email' | 'whatsapp') {}

  async send(payload: NotifPayload): Promise<NotifResult> {
    logger.info(`[LOG-MODE] ${this.canal.toUpperCase()} notification would be sent`, {
      canal: this.canal,
      eventId: payload.eventId,
      type: payload.type,
      severity: payload.severity,
      recipientEmail: payload.recipientEmail || undefined,
      recipientPhone: payload.recipientPhone || undefined,
      description: payload.description,
    });

    return { canal: this.canal, status: 'success', attempts: 1 };
  }
}
