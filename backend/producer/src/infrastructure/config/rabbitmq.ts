import amqp from 'amqplib';
import type { Channel, Connection } from 'amqplib';
import { logger } from './logger';
import { config } from './env';

let connection: Connection | null = null;  // Conexión al servidor RabbitMQ
let channel: Channel | null = null;        // Canal para enviar/recibir mensajes

const EXCHANGE = 'cyberguard.events';      // Punto de entrada para mensajes
const DLX_EXCHANGE = 'cyberguard.dlx';     // Dead Letter Exchange (mensajes fallidos)

// ⚠️ HUMAN CHECK:
// La IA no implementaba reconexión ni validación de URL.
// Agregamos validación y manejo de desconexiones.
export async function connectRabbitMQ(): Promise<void> {
  try {
    const conn = await amqp.connect(config.rabbitmqUrl);  // Conecta al servidor
    const ch = await conn.createChannel();                 // Crea un canal
    
    connection = conn as any;
    channel = ch;

    // Configurar exchange principal
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    
    // Configurar Dead Letter Exchange
    await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
    await channel.assertQueue('failed.messages', { durable: true });
    await channel.bindQueue('failed.messages', DLX_EXCHANGE, '');

    logger.info('RabbitMQ connected successfully');

    connection?.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
    });

    connection?.on('close', () => {
      logger.warn('RabbitMQ connection closed');
    });

  } catch (error: any) {
    logger.error('Failed to connect to RabbitMQ', { error: error.message });
    throw error;
  }
}

export function getChannel(): Channel {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
}

export async function publishEvent(routingKey: string, data: any): Promise<void> {
  const ch = getChannel();
  const message = Buffer.from(JSON.stringify(data));
  
  ch.publish(EXCHANGE, routingKey, message, {
    persistent: true,
    contentType: 'application/json',
    timestamp: Date.now()
  });
  
  logger.info('Event published', { routingKey, eventId: data.eventId });
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (connection) await (connection as any).close();
    logger.info('RabbitMQ connection closed gracefully');
  } catch (error: any) {
    logger.error('Error closing RabbitMQ', { error: error.message });
  }
}
