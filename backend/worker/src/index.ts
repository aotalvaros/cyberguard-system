import { startWebSocket, broadcast, closeWebSocket } from './websocket';
import { connectAndConsume, closeRabbit } from './rabbitmq';
import { handleMessage } from './handler';
import { WS_PORT } from './config';
import { logger } from './logger';
import { connectRedis, saveToRedis, closeRedis, getAllNotifPreferences } from './redis';
import { NotificationOrchestrator } from './notifications/notification.orchestrator';
import { EmailAdapter } from './notifications/email.adapter';
import { WhatsAppAdapter } from './notifications/whatsapp.adapter';
import { LogNotificationAdapter } from './notifications/log-notification.adapter';
import type { NotifPayload } from './notifications/notification.types';

function buildOrchestrator(): NotificationOrchestrator {
  const sgKey   = process.env.SENDGRID_API_KEY     || '';
  const sgFrom  = process.env.SENDGRID_FROM_EMAIL  || '';
  const twSid   = process.env.TWILIO_ACCOUNT_SID   || '';
  const twToken = process.env.TWILIO_AUTH_TOKEN     || '';
  const twFrom  = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  const emailService = sgKey && sgFrom
    ? new EmailAdapter(sgKey, sgFrom)
    : new LogNotificationAdapter('email');

  const whatsappService = twSid && twToken
    ? new WhatsAppAdapter(twSid, twToken, twFrom)
    : new LogNotificationAdapter('whatsapp');

  if (!sgKey || !sgFrom) logger.warn('SendGrid not configured — email notifications will be logged only');
  if (!twSid || !twToken) logger.warn('Twilio not configured — whatsapp notifications will be logged only');

  return new NotificationOrchestrator(emailService, whatsappService);
}

function extractNotifPayload(data: unknown, routingKey: string): NotifPayload | null {
  if (!data || typeof data !== 'object') return null;
  const event = data as Record<string, unknown>;
  const inner = (event['data'] ?? event) as Record<string, unknown>;

  return {
    eventId:        String(event['eventId'] ?? inner['threatId'] ?? ''),
    type:           String(inner['type'] ?? routingKey.split('.').pop() ?? 'other'),
    severity:       String(inner['severity'] ?? 'unknown'),
    sourceIp:       String(inner['sourceIp'] ?? 'N/A'),
    description:    String(inner['description'] ?? ''),
    receivedAt:     String(event['timestamp'] ?? new Date().toISOString()),
    recipientEmail: '',
    recipientPhone: '',
  };
}

async function main() {
  await connectRedis();
  startWebSocket(WS_PORT);

  const orchestrator = buildOrchestrator();

  await connectAndConsume(async (data, routingKey, _raw) => {
    const payload = await handleMessage(data, routingKey);
    await saveToRedis(payload);
    broadcast(payload);

    // — Notification dispatch —
    const notifPayload = extractNotifPayload(data, routingKey);
    if (!notifPayload) return;

    const allPrefs = await getAllNotifPreferences();
    if (allPrefs.length === 0) {
      logger.debug('No users with active notification preferences');
      return;
    }

    for (const prefs of allPrefs) {
      try {
        const results = await orchestrator.dispatch(notifPayload, prefs);
        for (const r of results) {
          if (r.status === 'success') {
            logger.info('Notification sent', { canal: r.canal, username: prefs.username, eventId: notifPayload.eventId });
          } else {
            logger.warn('Notification failed', { canal: r.canal, username: prefs.username, error: r.error });
          }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error('Notification dispatch error', { username: prefs.username, error: message });
      }
    }
  });
}

process.on('SIGINT', async () => {
  logger.info('Worker shutting down');
  await closeRabbit();
  await closeRedis();
  await closeWebSocket();
  process.exit(0);
});

main().catch((err) => {
  logger.error('Worker failed to start', { error: err?.message });
  process.exit(1);
});
