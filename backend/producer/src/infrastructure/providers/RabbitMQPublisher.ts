import { EventPublisher } from '../../domain/ports/EventPublisher';
import { RabbitMQConnection } from '../config/rabbitmq';
import { logger } from '../config/logger';

export class RabbitMQPublisher implements EventPublisher {
  private readonly connection: RabbitMQConnection;

  constructor() {
    this.connection = RabbitMQConnection.getInstance();
  }

  async publish(routingKey: string, event: Record<string, unknown>): Promise<void> {
    try {
      await this.connection.publishEvent(routingKey, event);
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
