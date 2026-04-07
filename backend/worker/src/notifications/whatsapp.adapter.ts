import axios from 'axios';
import { logger } from '../logger';
import { selectTemplate, renderTemplate } from './category-template.strategy';
import type { INotificationService, NotifPayload, NotifResult } from './notification.types';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const WA_API_BASE = 'https://graph.facebook.com/v18.0';

export class WhatsAppAdapter implements INotificationService {
  private readonly token: string;
  private readonly phoneNumberId: string;
  private readonly maxRetries: number;

  constructor(token: string, phoneNumberId: string, maxRetries = 3) {
    this.token = token;
    this.phoneNumberId = phoneNumberId;
    this.maxRetries = maxRetries;
  }

  async send(payload: NotifPayload): Promise<NotifResult> {
    const template = selectTemplate(payload.type);
    const rendered = renderTemplate(template, {
      severity: payload.severity,
      sourceIp: payload.sourceIp,
      description: payload.description,
    });

    const url = `${WA_API_BASE}/${this.phoneNumberId}/messages`;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await axios.post(
          url,
          {
            messaging_product: 'whatsapp',
            to: payload.recipientPhone,
            type: 'text',
            text: { body: `${rendered.subject}\n\n${rendered.body}` },
          },
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              'Content-Type': 'application/json',
            },
          },
        );

        logger.info('WhatsApp message sent successfully', {
          eventId: payload.eventId,
          to: payload.recipientPhone,
          attempt,
        });

        return { canal: 'whatsapp', status: 'success', attempts: attempt };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn('WhatsApp send failed', {
          eventId: payload.eventId,
          attempt,
          error: message,
        });

        if (attempt < this.maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          await delay(backoff);
        } else {
          return {
            canal: 'whatsapp',
            status: 'error',
            attempts: attempt,
            error: message,
          };
        }
      }
    }

    return { canal: 'whatsapp', status: 'error', attempts: this.maxRetries, error: 'Max retries reached' };
  }
}
