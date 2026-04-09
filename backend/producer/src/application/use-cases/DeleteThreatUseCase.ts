import { v4 as uuidv4 } from 'uuid';
import { ThreatRepository } from '../../domain/ports/ThreatRepository';
import { EventPublisher } from '../../domain/ports/EventPublisher';
import { ThreatNotFoundException } from '../../domain/exceptions/ThreatNotFoundException';
import { logger } from '../../infrastructure/config/logger';

export interface DeleteThreatResultDto {
  readonly deleted: boolean;
  readonly threatId: string;
  readonly message: string;
}

export class DeleteThreatUseCase {
  constructor(
    private readonly threatRepository: ThreatRepository,
    private readonly eventPublisher: EventPublisher
  ) {}

  async execute(threatId: string): Promise<DeleteThreatResultDto> {
    if (!threatId || threatId.trim().length === 0) {
      throw new Error('Threat ID is required');
    }

    const normalizedId = threatId.trim();

    logger.info('Executing DeleteThreatUseCase', { threatId: normalizedId });

    const existingThreat = await this.threatRepository.findById(normalizedId);

    if (!existingThreat) {
      throw new ThreatNotFoundException(normalizedId);
    }

    const deleted = await this.threatRepository.delete(normalizedId);

    if (!deleted) {
      throw new ThreatNotFoundException(normalizedId);
    }

    const routingKey = `threat.deleted.${existingThreat.type}`;
    const event = {
      eventId: uuidv4(),
      eventType: 'threat.deleted',
      timestamp: new Date().toISOString(),
      data: {
        threatId: normalizedId,
        type: existingThreat.type
      }
    };

    try {
      await this.eventPublisher.publish(routingKey, event);
      logger.info('Threat deleted event published', { threatId: normalizedId, routingKey });
    } catch (publishError: unknown) {
      const msg = publishError instanceof Error ? publishError.message : String(publishError);
      logger.error('Failed to publish threat.deleted event', { error: msg, threatId: normalizedId });
    }

    logger.info('Threat deleted successfully', { threatId: normalizedId });

    return {
      deleted: true,
      threatId: normalizedId,
      message: `Threat ${normalizedId} deleted successfully`
    };
  }
}
