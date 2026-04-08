import dotenv from 'dotenv';

dotenv.config();

export const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
if (!process.env.RABBITMQ_URL) {
	
	console.warn('WORKER: RABBITMQ_URL not set, defaulting to amqp://localhost');
}

export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const WS_PORT = Number(process.env.WORKER_WS_PORT || 8081);
export const EXCHANGE = process.env.WORKER_EXCHANGE || 'cyberguard.events';
export const TOPIC = process.env.WORKER_TOPIC || '#';
