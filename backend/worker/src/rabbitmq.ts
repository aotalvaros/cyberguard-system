import * as amqp from 'amqplib';
import { logger } from './logger';
import { RABBITMQ_URL, EXCHANGE, TOPIC } from './config';

let connection: any = null;
let channel: any = null;

export async function connectAndConsume(onMessage: (data: any, routingKey: string, raw: amqp.ConsumeMessage) => Promise<void>) {
  try {
    // amqplib's connect can return different internal models; cast via unknown to the public Connection type
    connection = await amqp.connect(RABBITMQ_URL) as unknown as amqp.Connection;
    connection.on('error', (err: any) => logger.error('RabbitMQ connection error', { error: err?.message }));
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed, reconnecting in 2s');
      setTimeout(() => connectAndConsume(onMessage).catch(() => {/*ignore*/}), 2000);
    });
    // create channel and use local variables to satisfy TS non-null reasoning
    const ch: any = await connection.createChannel();
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
        // Acknowledge only after handler succeeds
        try { ch.ack(msg); } catch (e) { logger.error('Failed to ack message', { error: (e as any)?.message }); }
      } catch (err: any) {
        logger.error('Error processing RabbitMQ message', { error: err?.message });
        // nack to DLX
        try { ch.nack(msg, false, false); } catch {}
      }
    }, { noAck: false });

  } catch (err: any) {
    logger.error('Failed to connect to RabbitMQ', { error: err?.message });
    setTimeout(() => connectAndConsume(onMessage).catch(() => {/*ignore*/}), 2000);
  }
}

export async function closeRabbit() {
  try {
    await channel?.close();
    await (connection as any)?.close();
  } catch (e) {
    // ignore
  }
}
