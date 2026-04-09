/**
 * @deprecated Compatibility shim — la implementación vive en infrastructure/persistence/RedisEventRepository.ts
 * Mantiene los exports de funciones para backward compatibility con los tests existentes.
 */
import { RedisEventRepository } from './infrastructure/persistence/RedisEventRepository';

export type { StoredNotifPreferences } from './domain/ports/IEventRepository';

let _instance: RedisEventRepository | null = null;
const getInstance = (): RedisEventRepository => {
  if (!_instance) _instance = new RedisEventRepository();
  return _instance;
};

export const connectRedis              = (url?: string)    => getInstance().connect(url);
export const saveToRedis               = (payload: unknown) => getInstance().save(payload);
export const getHistoryFromRedis       = ()                 => getInstance().getHistory();
export const clearHistoryFromRedis     = ()                 => getInstance().clearHistory();
export const removeHistoryItemById     = (id: string)       => getInstance().removeById(id);
export const removeHistoryItemByThreatId = (threatId: string) => getInstance().removeByThreatId(threatId);
export const getAllNotifPreferences    = ()                 => getInstance().getAllNotifPreferences();
export const closeRedis                = ()                 => getInstance().close();
