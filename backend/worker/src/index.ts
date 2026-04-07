import { startWebSocket, broadcast, closeWebSocket } from './websocket';
import { connectAndConsume, closeRabbit } from './rabbitmq';
import { handleMessage } from './handler';
import { WS_PORT, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, WA_TOKEN, WA_PHONE_NUMBER_ID } from './config';
import { logger } from './logger';
import { connectRedis, saveToRedis, closeRedis, getNotifPreferences, saveNotifLog } from './redis';
import { NotificationOrchestrator } from './notifications/notification.orchestrator';
import { EmailAdapter } from './notifications/email.adapter';
import { WhatsAppAdapter } from './notifications/whatsapp.adapter';

async function main() {
  await connectRedis();
  startWebSocket(WS_PORT);

  const orchestrator = new NotificationOrchestrator(
    new EmailAdapter(SENDGRID_API_KEY, SENDGRID_FROM_EMAIL),
    new WhatsAppAdapter(WA_TOKEN, WA_PHONE_NUMBER_ID),
  );

  await connectAndConsume(async (data, routingKey, _raw) => {
    const payload = await handleMessage(data, routingKey);
    await saveToRedis(payload);
    broadcast(payload);

    const record = payload as Record<string, unknown>;
    const eventId = typeof record['eventId'] === 'string' ? record['eventId'] : 'unknown';
    const threatData = (record['data'] ?? {}) as Record<string, unknown>;

    void (async () => {
      try {

        const prefs = await getNotifPreferences('admin');
        if (!prefs) return;

        const results = await orchestrator.dispatch(
          {
            eventId,
            type: String(threatData['type'] ?? 'other'),
            severity: String(threatData['severity'] ?? 'low'),
            sourceIp: String(threatData['sourceIp'] ?? ''),
            description: String(threatData['description'] ?? ''),
            receivedAt: String(record['receivedAt'] ?? new Date().toISOString()),
            recipientEmail: prefs.email,
            recipientPhone: prefs.phone,
          },
          prefs,
        );

        if (results.length > 0) {
          await saveNotifLog(eventId, results);
        }
      } catch (err: unknown) {
        logger.error('External notification dispatch failed', {
          eventId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
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
