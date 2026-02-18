import { EventPublisher } from '../../domain/ports/EventPublisher';
import { publishEvent } from '../config/rabbitmq';
import { logger } from '../config/logger';

export class RabbitMQPublisher implements EventPublisher {
  async publish(routingKey: string, event: any): Promise<void> {
    try {
      await publishEvent(routingKey, event);
    } catch (error: any) {
      logger.error('Failed to publish event to RabbitMQ', {
        routingKey,
        error: error.message
      });
      throw error;
    }
  }
}