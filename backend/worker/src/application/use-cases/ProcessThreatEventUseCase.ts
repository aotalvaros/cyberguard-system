import type { IEventRepository } from '../../domain/ports/IEventRepository';
import type { IBroadcaster } from '../../domain/ports/IBroadcaster';
import type { NotifPayload } from '../../domain/ports/INotificationService';
import type { INotificationOrchestrator } from '../../domain/ports/INotificationOrchestrator';
import { logger } from '../../infrastructure/logging';

type ThreatPayload = Readonly<{
  routingKey: string;
  data: unknown;
  receivedAt: string;
}>;

const sanitizeString = (str: string): string => str.replace(/[<>"'&]/g, '');

/**
 * Orquesta el pipeline completo de procesamiento de un evento de amenaza:
 * 1. Sanitizar y construir payload
 * 2. Persistir en Redis
 * 3. Broadcast por WebSocket
 * 4. Despachar notificaciones a todos los usuarios con preferencias activas
 */
export class ProcessThreatEventUseCase {
  constructor(
    private readonly repository: IEventRepository,
    private readonly broadcaster: IBroadcaster,
    private readonly orchestrator: INotificationOrchestrator,
  ) {}

  async execute(rawData: unknown, routingKey: string): Promise<void> {
    // 1. Sanitizar y construir payload
    const payload = this.buildPayload(rawData, routingKey);

    // 2. Persistir
    await this.repository.save(payload);

    // 3. Broadcast
    this.broadcaster.broadcast(payload);

    // 4. Notificaciones
    const notifPayload = this.extractNotifPayload(rawData, routingKey);
    if (!notifPayload) return;

    const allPrefs = await this.repository.getAllNotifPreferences();
    if (allPrefs.length === 0) {
      logger.debug('No users with active notification preferences');
      return;
    }

    for (const prefs of allPrefs) {
      try {
        const results = await this.orchestrator.dispatch(notifPayload, prefs);
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
  }

  private buildPayload(data: unknown, routingKey: string): ThreatPayload {
    if (typeof data === 'string') {
      const sanitized = sanitizeString(data);
      if (sanitized !== data) logger.warn('Input contained dangerous characters');
    }
    return {
      routingKey: sanitizeString(routingKey),
      data,
      receivedAt: new Date().toISOString(),
    };
  }

  private extractNotifPayload(data: unknown, routingKey: string): NotifPayload | null {
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
}
