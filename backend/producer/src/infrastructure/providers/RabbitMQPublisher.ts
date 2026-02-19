import { EventPublisher } from '../../domain/ports/EventPublisher';
import { publishEvent } from '../config/rabbitmq';
import { logger } from '../config/logger';

export class RabbitMQPublisher implements EventPublisher {
  async publish(routingKey: string, event: Record<string, unknown>): Promise<void> {
    try {
      await publishEvent(routingKey, event);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to publish event to RabbitMQ', {
        routingKey,
        error: message
      });
      throw error;
    }
  }
}