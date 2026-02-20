import dotenv from 'dotenv';

dotenv.config();

// The worker must be able to run independently from the backend process.
// Do NOT import the backend env loader here because it will exit the process
// when required variables are missing. Read only the values needed with
// safe defaults and warn when not provided.
export const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
if (!process.env.RABBITMQ_URL) {
	// eslint-disable-next-line no-console
	console.warn('WORKER: RABBITMQ_URL not set, defaulting to amqp://localhost');
}

export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const WS_PORT = Number(process.env.WORKER_WS_PORT || 8081);
export const EXCHANGE = process.env.WORKER_EXCHANGE || 'cyberguard.events';
export const TOPIC = process.env.WORKER_TOPIC || '#';
