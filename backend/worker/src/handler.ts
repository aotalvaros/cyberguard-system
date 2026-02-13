import { logger } from './logger';

type Payload = Readonly<{
  routingKey: string;
  data: unknown;
  receivedAt: string;
}>;

const sanitizeString = (str: string): string => str.replace(/[<>"'&]/g, '');

const isValidPayload = (obj: unknown): obj is Payload => (
  typeof obj === 'object' &&
  obj !== null &&
  'routingKey' in obj &&
  'data' in obj &&
  'receivedAt' in obj &&
  typeof (obj as any).routingKey === 'string' &&
  typeof (obj as any).receivedAt === 'string'
);

export const buildPayload = (data: unknown, routingKey: string): Payload => ({
  routingKey: sanitizeString(routingKey),
  data,
  receivedAt: new Date().toISOString()
});

export const handleMessage = async (rawData: unknown, routingKey: string): Promise<Payload> => {
  try {
    if (typeof rawData === 'string') {
      const sanitized = sanitizeString(rawData);
      if (sanitized !== rawData) {
        logger.warn('Input contained dangerous characters');
      }
    }
    
    const payload = buildPayload(rawData, routingKey);
    
    if (!isValidPayload(payload)) {
      throw new Error('Invalid payload structure');
    }
    
    return payload;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Handler failed', { error: message });
    throw err;
  }
};
