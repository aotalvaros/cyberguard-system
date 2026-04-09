import type { IEventRepository } from '../../domain/ports/IEventRepository';
import type { IBroadcaster } from '../../domain/ports/IBroadcaster';
import { logger } from '../../logger';

/**
 * Maneja el evento threat.deleted:
 * 1. Elimina el evento del historial de Redis por threatId
 * 2. Broadcast del evento de eliminación por WebSocket
 */
export class ProcessDeletedThreatUseCase {
  constructor(
    private readonly repository: IEventRepository,
    private readonly broadcaster: IBroadcaster,
  ) {}

  async execute(data: unknown, routingKey: string): Promise<void> {
    const threatId = this.extractThreatId(data);

    if (!threatId) {
      logger.warn('Threat deleted event missing threatId', { routingKey });
      return;
    }

    await this.repository.removeByThreatId(threatId);
    this.broadcaster.broadcast({ type: 'delete-one', id: threatId, deletedAt: new Date().toISOString() });
    logger.info('Threat deleted event processed', { threatId, routingKey });
  }

  private extractThreatId(data: unknown): string | null {
    if (!data || typeof data !== 'object') return null;
    const event = data as Record<string, unknown>;
    const inner = (event['data'] ?? event) as Record<string, unknown>;
    const threatId = inner['threatId'] ?? event['threatId'];
    return typeof threatId === 'string' && threatId ? threatId : null;
  }
}
