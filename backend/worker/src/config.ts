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

export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
export const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@cyberguard.com';
export const WA_TOKEN = process.env.WA_TOKEN || '';
export const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID || '';

if (!process.env.SENDGRID_API_KEY) {

	console.warn('WORKER: SENDGRID_API_KEY not set — email notifications disabled');
}
if (!process.env.WA_TOKEN) {

	console.warn('WORKER: WA_TOKEN not set — WhatsApp notifications disabled');
}
