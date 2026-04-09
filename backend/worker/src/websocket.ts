/**
 * @deprecated Compatibility shim — la implementación vive en infrastructure/websocket/WebSocketBroadcaster.ts
 */
import type { Server } from 'ws';
import { WebSocketBroadcaster } from './infrastructure/websocket/WebSocketBroadcaster';
import type { IEventRepository } from './domain/ports/IEventRepository';
import * as redisShim from './redis';

/**
 * Adapter que envuelve el shim redis.ts para satisfacer IEventRepository.
 * Garantiza que los mocks de tests en ../../redis sean respetados.
 */
const redisAsRepository: IEventRepository = {
  connect: (url) => redisShim.connectRedis(url),
  close: () => redisShim.closeRedis(),
  save: (p) => redisShim.saveToRedis(p),
  getHistory: () => redisShim.getHistoryFromRedis(),
  clearHistory: () => redisShim.clearHistoryFromRedis(),
  removeById: (id) => redisShim.removeHistoryItemById(id),
  removeByThreatId: (id) => redisShim.removeHistoryItemByThreatId(id),
  getAllNotifPreferences: () => redisShim.getAllNotifPreferences(),
};

let _broadcaster: WebSocketBroadcaster | null = null;
const getInstance = (): WebSocketBroadcaster => {
  if (!_broadcaster) _broadcaster = new WebSocketBroadcaster(redisAsRepository);
  return _broadcaster;
};

export const startWebSocket = (port: number): Server => getInstance().start(port) as Server;
export const broadcast = (payload: unknown): void => getInstance().broadcast(payload);
export const closeWebSocket = async (): Promise<void> => {
  await getInstance().close();
  _broadcaster = null; // reset para que el próximo test cree una instancia fresca
};
