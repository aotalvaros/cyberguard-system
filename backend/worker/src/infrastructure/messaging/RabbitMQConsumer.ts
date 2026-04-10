import * as amqp from 'amqplib';
import type { IMessageConsumer } from '../../domain/ports/IMessageConsumer';
import { logger } from '../logging';
import { RABBITMQ_URL, EXCHANGE, TOPIC } from '../config';

/**
 * Adaptador de RabbitMQ.
 * Implementa IMessageConsumer usando amqplib con auto-reconnect y manual ACK/NACK.
 * Patrón EDA: Pub/Sub con Topic Exchange + Manual ACK + Dead Letter Exchange (DLX) mediante nack(false,false).
 */
export class RabbitMQConsumer implements IMessageConsumer {
  private connection: amqp.ChannelModel | null = null;
  private channel: amqp.Channel | null = null;

  async consume(onMessage: (data: unknown, routingKey: string, raw?: unknown) => Promise<void>): Promise<void> {
    try {
      this.connection = await amqp.connect(RABBITMQ_URL);
      if (!this.connection) throw new Error('Failed to establish RabbitMQ connection');

      this.connection.on('error', (err: Error) =>
        logger.error('RabbitMQ connection error', { error: err.message }),
      );
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, reconnecting in 2s');
        setTimeout(() => this.consume(onMessage).catch(() => {}), 2000);
      });

      const ch = await this.connection.createChannel();
      this.channel = ch;

      await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
      const q = await ch.assertQueue('', { exclusive: true });
      await ch.bindQueue(q.queue, EXCHANGE, TOPIC);

      logger.info('RabbitMQ consumer bound', { exchange: EXCHANGE, queue: q.queue, topic: TOPIC });

      await ch.consume(q.queue, async (msg: amqp.ConsumeMessage | null) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          await onMessage(data, msg.fields.routingKey, msg);
          try { ch.ack(msg); } catch (e) {
            logger.error('Failed to ack message', { error: (e as Error).message });
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          logger.error('Error processing RabbitMQ message', { error: errorMessage });
          try { ch.nack(msg, false, false); } catch { /* silencioso */ }
        }
      }, { noAck: false });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to connect to RabbitMQ', { error: errorMessage });
      setTimeout(() => this.consume(onMessage).catch(() => {}), 2000);
    }
  }

  async close(): Promise<void> {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch { /* silencioso en shutdown */ }
  }
}
