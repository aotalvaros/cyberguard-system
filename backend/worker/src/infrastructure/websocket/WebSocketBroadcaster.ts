import WebSocket, { Server } from 'ws';
import type { IBroadcaster } from '../../domain/ports/IBroadcaster';
import type { IEventRepository } from '../../domain/ports/IEventRepository';
import { logger } from '../logging';

type WebSocketMessage = {
  type: 'clear-all' | 'delete-one';
  id?: string;
};

const isValidMessage = (obj: unknown): obj is WebSocketMessage => {
  if (typeof obj !== 'object' || obj === null) return false;
  const msg = obj as Record<string, unknown>;
  return (
    typeof msg['type'] === 'string' &&
    ['clear-all', 'delete-one'].includes(msg['type']) &&
    (msg['type'] !== 'delete-one' || typeof msg['id'] === 'string')
  );
};

/**
 * Adaptador WebSocket.
 * Implementa IBroadcaster usando la librería 'ws'.
 * Al conectar un cliente nuevo, envía el historial desde Redis (Event History Pattern).
 * Patrón: Observer — detecta nuevas conexiones y reenvía historial almacenado.
 */
export class WebSocketBroadcaster implements IBroadcaster {
  private wss: Server | null = null;

  constructor(private readonly repository: IEventRepository) {}

  start(port: number): Server {
    this.wss = new Server({ port });
    this.wss.on('listening', () => logger.info(`WebSocket listening on ws://localhost:${port}`));
    this.wss.on('connection', (socket: WebSocket) => this.handleConnection(socket));
    return this.wss;
  }

  getServer(): Server | null {
    return this.wss;
  }

  broadcast(payload: unknown): void {
    if (!this.wss) return;
    const str = JSON.stringify(payload);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(str);
      }
    });
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      if (!this.wss) return resolve();
      // Cerrar todos los clientes activos primero
      this.wss.clients.forEach(client => client.terminate());
      this.wss.close(() => {
        this.wss = null;
        resolve();
      });
    });
  }

  private async handleConnection(socket: WebSocket): Promise<void> {
    logger.info('WebSocket client connected');

    try {
      const history = await this.repository.getHistory();
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
          await this.repository.clearHistory();
          this.broadcast({ type: 'clear-all', clearedAt: new Date().toISOString() });
          return;
        }

        if (msg.type === 'delete-one' && msg.id) {
          await this.repository.removeById(msg.id);
          await this.repository.removeByThreatId(msg.id);
          this.broadcast({ type: 'delete-one', id: msg.id, deletedAt: new Date().toISOString() });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.warn('WebSocket message ignored', { error: message });
      }
    });

    socket.on('close', () => logger.info('WebSocket client disconnected'));
    socket.on('error', (err: Error) => logger.error('WebSocket client error', { error: err.message }));
  }
}
