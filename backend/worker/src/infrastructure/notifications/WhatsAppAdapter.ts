import axios from 'axios';
import { logger } from '../logging';
import { selectTemplate, renderTemplate } from './CategoryTemplateStrategy';
import type { INotificationService, NotifPayload, NotifResult } from '../../domain/ports/INotificationService';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01/Accounts';

/**
 * Adaptador Twilio.
 * Implementa INotificationService para el canal WhatsApp.
 * Patrón: Adapter + Retry con Exponential Backoff.
 */
export class WhatsAppAdapter implements INotificationService {
  private readonly maxRetries: number;

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber = 'whatsapp:+14155238886',
    maxRetries = 3,
  ) {
    this.maxRetries = maxRetries;
  }

  async send(payload: NotifPayload): Promise<NotifResult> {
    const template = selectTemplate(payload.type);
    const rendered = renderTemplate(template, {
      severity: payload.severity,
      sourceIp: payload.sourceIp,
      description: payload.description,
    });

    const toNumber = payload.recipientPhone.startsWith('whatsapp:')
      ? payload.recipientPhone
      : `whatsapp:${payload.recipientPhone}`;

    const url = `${TWILIO_API_BASE}/${this.accountSid}/Messages.json`;
    const body = `${rendered.subject}\n\n${rendered.body}`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const params = new URLSearchParams();
        params.append('To', toNumber);
        params.append('From', this.fromNumber);
        params.append('Body', body);

        await axios.post(url, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          auth: { username: this.accountSid, password: this.authToken },
        });

        logger.info('WhatsApp message sent successfully', { eventId: payload.eventId, to: payload.recipientPhone, attempt });
        return { canal: 'whatsapp', status: 'success', attempts: attempt };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn('WhatsApp send failed', { eventId: payload.eventId, attempt, error: message });
        if (attempt < this.maxRetries) {
          await delay(Math.min(1000 * Math.pow(2, attempt - 1), 30000));
        } else {
          return { canal: 'whatsapp', status: 'error', attempts: attempt, error: message };
        }
      }
    }
    return { canal: 'whatsapp', status: 'error', attempts: this.maxRetries, error: 'Max retries reached' };
  }
}
