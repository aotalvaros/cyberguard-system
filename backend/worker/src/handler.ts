import { logger } from './logger';

export function buildPayload(data: any, routingKey: string) {
  return {
    routingKey,
    data,
    receivedAt: new Date().toISOString()
  };
}

export async function handleMessage(rawData: any, routingKey: string) {
  try {
    // Basic normalization / validation can go here
    const payload = buildPayload(rawData, routingKey);
    return payload;
  } catch (err: any) {
    logger.error('Handler failed to process message', { error: err?.message });
    throw err;
  }
}
