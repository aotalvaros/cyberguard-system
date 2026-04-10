import sgMail from '@sendgrid/mail';
import { logger } from '../logging';
import { selectTemplate, renderTemplate } from './CategoryTemplateStrategy';
import type { INotificationService, NotifPayload, NotifResult } from '../../domain/ports/INotificationService';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Adaptador SendGrid.
 * Implementa INotificationService para el canal email.
 * Patrón: Adapter + Retry con Exponential Backoff.
 */
export class EmailAdapter implements INotificationService {
  private readonly maxRetries: number;
  private readonly fromEmail: string;

  constructor(apiKey: string, fromEmail: string, maxRetries = 3) {
    sgMail.setApiKey(apiKey);
    this.fromEmail = fromEmail;
    this.maxRetries = maxRetries;
  }

  async send(payload: NotifPayload): Promise<NotifResult> {
    const template = selectTemplate(payload.type);
    const rendered = renderTemplate(template, {
      severity: payload.severity,
      sourceIp: payload.sourceIp,
      description: payload.description,
    });

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await sgMail.send({
          to: payload.recipientEmail,
          from: this.fromEmail,
          subject: rendered.subject,
          text: rendered.body,
        });
        logger.info('Email sent successfully', { eventId: payload.eventId, to: payload.recipientEmail, attempt });
        return { canal: 'email', status: 'success', attempts: attempt };
      } catch (err: unknown) {
        let message = err instanceof Error ? err.message : String(err);
        const sgErr = err as { response?: { body?: { errors?: Array<{ message: string }> }; statusCode?: number } };
        if (sgErr?.response?.body?.errors) {
          message = sgErr.response.body.errors.map(e => e.message).join('; ');
        }
        logger.warn('Email send failed', { eventId: payload.eventId, attempt, error: message, statusCode: sgErr?.response?.statusCode });
        if (attempt < this.maxRetries) {
          await delay(Math.min(1000 * Math.pow(2, attempt - 1), 30000));
        } else {
          return { canal: 'email', status: 'error', attempts: attempt, error: message };
        }
      }
    }
    return { canal: 'email', status: 'error', attempts: this.maxRetries, error: 'Max retries reached' };
  }
}
