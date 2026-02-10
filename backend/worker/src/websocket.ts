import WebSocket, { Server } from 'ws';
import { logger } from '../../src/config/logger';

let wss: Server | null = null;

export function startWebSocket(port: number) {
  wss = new Server({ port });

  wss.on('listening', () => logger.info(`Worker WebSocket listening on ws://localhost:${port}`));
  wss.on('connection', (socket: WebSocket) => {
    logger.info('WebSocket client connected');
    socket.on('close', () => logger.info('WebSocket client disconnected'));
    socket.on('error', (err: any) => logger.error('WebSocket client error', { error: err?.message }));
  });

  return wss;
}

export function broadcast(payload: any) {
  if (!wss) return;
  const str = JSON.stringify(payload);
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) client.send(str);
  });
}

export function closeWebSocket(): Promise<void> {
  return new Promise((resolve) => wss?.close(() => resolve()) ?? resolve());
}
