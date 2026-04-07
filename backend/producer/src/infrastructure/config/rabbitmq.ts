import amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import { logger } from './logger';
import { config } from './env';

const EXCHANGE = 'cyberguard.events';
const DLX_EXCHANGE = 'cyberguard.dlx';

export class RabbitMQConnection {
  private static instance: RabbitMQConnection;
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;

  private constructor() {}

  static getInstance(): RabbitMQConnection {
    if (!RabbitMQConnection.instance) {
      RabbitMQConnection.instance = new RabbitMQConnection();
    }
    return RabbitMQConnection.instance;
  }

  async connect(): Promise<void> {
    if (this.connection && this.channel) {
      return;
    }

    try {
      const conn = await amqp.connect(config.rabbitmqUrl);
      const ch = await conn.createConfirmChannel();

      this.connection = conn;
      this.channel = ch;

      await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });

      await this.channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
      await this.channel.assertQueue('failed.messages', { durable: true });
      await this.channel.bindQueue('failed.messages', DLX_EXCHANGE, '');

      logger.info('RabbitMQ connected with Publisher Confirms enabled');

      this.connection.on('error', (err: Error) => {
        logger.error('RabbitMQ connection error', { error: err.message });
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.connection = null;
        this.channel = null;
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to connect to RabbitMQ', { error: message });
      throw error;
    }
  }

  getChannel(): ConfirmChannel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    return this.channel;
  }

  async publishEvent(routingKey: string, data: Record<string, unknown>): Promise<void> {
    const ch = this.getChannel();
    const message = Buffer.from(JSON.stringify(data));

    return new Promise<void>((resolve, reject) => {
      const published = ch.publish(
        EXCHANGE,
        routingKey,
        message,
        {
          persistent: true,
          contentType: 'application/json',
          timestamp: Date.now()
        },
        (err: unknown) => {
          if (err) {
            const errMessage = err instanceof Error ? err.message : String(err);
            logger.error('Event NACK - not confirmed by RabbitMQ', {
              routingKey,
              eventId: data.eventId,
              error: errMessage
            });
            reject(err instanceof Error ? err : new Error(errMessage));
          } else {
            logger.info('Event published and confirmed', {
              routingKey,
              eventId: data.eventId
            });
            resolve();
          }
        }
      );

      if (!published) {
        logger.warn('RabbitMQ channel buffer full, waiting for drain', { routingKey });
        ch.once('drain', () => {
          logger.info('RabbitMQ channel drained, resuming', { routingKey });
        });
      }
    });
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.waitForConfirms();
        await this.channel.close();
      }
      if (this.connection) await this.connection.close();
      this.channel = null;
      this.connection = null;
      logger.info('RabbitMQ connection closed gracefully');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Error closing RabbitMQ', { error: message });
    }
  }

  static resetInstance(): void {
    RabbitMQConnection.instance = undefined as unknown as RabbitMQConnection;
  }
}

const rabbit = RabbitMQConnection.getInstance();

export async function connectRabbitMQ(): Promise<void> {
  await rabbit.connect();
}

export async function publishEvent(routingKey: string, data: Record<string, unknown>): Promise<void> {
  await rabbit.publishEvent(routingKey, data);
}

export async function closeRabbitMQ(): Promise<void> {
  await rabbit.close();
}
