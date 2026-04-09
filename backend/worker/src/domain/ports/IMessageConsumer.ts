/**
 * Puerto del consumidor de mensajes del broker.
 * Abstrae la conexión y consumo del bus de eventos (RabbitMQ).
 */
export interface IMessageConsumer {
  consume(onMessage: (data: unknown, routingKey: string, raw?: unknown) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}
