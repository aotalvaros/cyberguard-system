import WebSocket, { Server } from 'ws';
import { logger } from './logger';
import { getHistoryFromRedis, clearHistoryFromRedis, removeHistoryItemById, removeHistoryItemByThreatId } from './redis';

type WebSocketMessage = {
  type: 'clear-all' | 'delete-one';
  id?: string;
};

const isValidMessage = (obj: unknown): obj is WebSocketMessage => {
  if (typeof obj !== 'object' || obj === null) return false;
  const msg = obj as Record<string, unknown>;
  return typeof msg['type'] === 'string' &&
         ['clear-all', 'delete-one'].includes(msg['type']) &&
         (msg['type'] !== 'delete-one' || typeof msg['id'] === 'string');
};

let wss: Server | null = null;

export const startWebSocket = (port: number): Server => {
  wss = new Server({ port });

  wss.on('listening', () => logger.info(`WebSocket listening on ws://localhost:${port}`));

  wss.on('connection', async (socket: WebSocket) => {
    logger.info('WebSocket client connected');

    try {
      const history = await getHistoryFromRedis();
      if (history.length > 0) {
        history.reverse().forEach(item => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(item));
          }
        });
        logger.info('Sent history to new client', { count: history.length });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to send history', { error: message });
    }

    socket.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (!isValidMessage(msg)) {
          logger.warn('Invalid WebSocket message format', { msg });
          return;
        }

        if (msg.type === 'clear-all') {
          await clearHistoryFromRedis();
          broadcast({ type: 'clear-all', clearedAt: new Date().toISOString() });
          return;
        }

        if (msg.type === 'delete-one' && msg.id) {
          // Try both: by eventId (message ID) and by threatId (domain ID)
          await removeHistoryItemById(msg.id);
          await removeHistoryItemByThreatId(msg.id);
          broadcast({ type: 'delete-one', id: msg.id, deletedAt: new Date().toISOString() });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.warn('WebSocket message ignored', { error: message });
      }
    });

    socket.on('close', () => logger.info('WebSocket client disconnected'));
    socket.on('error', (err: Error) => logger.error('WebSocket client error', { error: err.message }));
  });

  return wss;
};

export const broadcast = (payload: unknown): void => {
  if (!wss) return;
  const str = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  });
};

export const closeWebSocket = (): Promise<void> => {
  return new Promise(resolve => wss?.close(() => resolve()) ?? resolve());
};
