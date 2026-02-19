import amqp from 'amqplib';
import type { ChannelModel, ConfirmChannel } from 'amqplib';
import { logger } from './logger';
import { config } from './env';

let connection: ChannelModel | null = null;
let channel: ConfirmChannel | null = null;

const EXCHANGE = 'cyberguard.events';
const DLX_EXCHANGE = 'cyberguard.dlx';

export async function connectRabbitMQ(): Promise<void> {
  try {
    const conn = await amqp.connect(config.rabbitmqUrl);
    const ch = await conn.createConfirmChannel();
    
    connection = conn;
    channel = ch;

    // Configurar exchange principal
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    
    // Configurar Dead Letter Exchange
    await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
    await channel.assertQueue('failed.messages', { durable: true });
    await channel.bindQueue('failed.messages', DLX_EXCHANGE, '');

    logger.info('RabbitMQ connected with Publisher Confirms enabled');

    connection?.on('error', (err: Error) => {
      logger.error('RabbitMQ connection error', { error: err.message });
    });

    connection?.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to connect to RabbitMQ', { error: message });
    throw error;
  }
}

export function getChannel(): ConfirmChannel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

export async function publishEvent(routingKey: string, data: Record<string, unknown>): Promise<void> {
  const ch = getChannel();
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

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.waitForConfirms();
      await channel.close();
    }
    if (connection) await connection.close();
    logger.info('RabbitMQ connection closed gracefully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error closing RabbitMQ', { error: message });
  }
}
