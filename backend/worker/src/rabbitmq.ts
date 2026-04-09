/**
 * @deprecated Compatibility shim — la implementación vive en infrastructure/messaging/RabbitMQConsumer.ts
 */
import { RabbitMQConsumer } from './infrastructure/messaging/RabbitMQConsumer';
import type * as amqp from 'amqplib';

let _instance: RabbitMQConsumer | null = null;
const getInstance = (): RabbitMQConsumer => {
  if (!_instance) _instance = new RabbitMQConsumer();
  return _instance;
};

export const connectAndConsume = (
  onMessage: (data: unknown, routingKey: string, raw: amqp.ConsumeMessage) => Promise<void>,
): Promise<void> =>
  getInstance().consume((data, routingKey, raw) => onMessage(data, routingKey, raw as amqp.ConsumeMessage));

export const closeRabbit = (): Promise<void> => getInstance().close();
