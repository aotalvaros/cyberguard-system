import * as amqp from 'amqplib';
import { logger } from './logger';
import { RABBITMQ_URL, EXCHANGE, TOPIC } from './config';

let connection: amqp.ChannelModel | null = null;
let channel: amqp.Channel | null = null;

export async function connectAndConsume(onMessage: (data: unknown, routingKey: string, raw: amqp.ConsumeMessage) => Promise<void>) {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    if (!connection) throw new Error('Failed to establish connection');

    connection.on('error', (err: Error) => logger.error('RabbitMQ connection error', { error: err.message }));
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed, reconnecting in 2s');
      setTimeout(() => connectAndConsume(onMessage).catch(() => {}), 2000);
    });
    const ch = await connection.createChannel();
    channel = ch;
    await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

    const q = await ch.assertQueue('', { exclusive: true });
    await ch.bindQueue(q.queue, EXCHANGE, TOPIC);

    logger.info('RabbitMQ consumer bound', { exchange: EXCHANGE, queue: q.queue, topic: TOPIC });

    await ch.consume(q.queue, async (msg: amqp.ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const content = msg.content.toString();
        const data = JSON.parse(content);
        await onMessage(data, msg.fields.routingKey, msg);
        try { ch.ack(msg); } catch (e) { logger.error('Failed to ack message', { error: (e as Error).message }); }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logger.error('Error processing RabbitMQ message', { error: errorMessage });
        try { ch.nack(msg, false, false); } catch {}
      }
    }, { noAck: false });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Failed to connect to RabbitMQ', { error: errorMessage });
    setTimeout(() => connectAndConsume(onMessage).catch(() => {}), 2000);
  }
}

export async function closeRabbit() {
  try {
    await channel?.close();
    await connection?.close();
  } catch (e) {

  }
}
