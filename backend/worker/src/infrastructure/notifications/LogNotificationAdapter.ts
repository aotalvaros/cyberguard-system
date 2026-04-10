import { logger } from '../logging';
import type { INotificationService, NotifPayload, NotifResult } from '../../domain/ports/INotificationService';

/**
 * Adaptador de notificación por logging.
 * Graceful Degradation — usado cuando no hay credenciales configuradas (dev/CI).
 * Nunca falla: solo loguea el intento de envío.
 */
export class LogNotificationAdapter implements INotificationService {
  constructor(private readonly canal: 'email' | 'whatsapp') {}

  async send(payload: NotifPayload): Promise<NotifResult> {
    logger.info(`[${this.canal.toUpperCase()} MOCK] Notification would be sent`, {
      eventId: payload.eventId,
      canal: this.canal,
      recipient: this.canal === 'email' ? payload.recipientEmail : payload.recipientPhone,
      type: payload.type,
      severity: payload.severity,
    });
    return { canal: this.canal, status: 'success', attempts: 1 };
  }
}
