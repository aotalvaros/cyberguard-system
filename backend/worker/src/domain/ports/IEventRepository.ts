export interface StoredNotifPreferences {
  username?: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}

/**
 * Puerto de persistencia de eventos para el Worker.
 * Abstrae el almacén de historial de amenazas y preferencias de notificación.
 */
export interface IEventRepository {
  connect(url?: string): Promise<void>;
  close(): Promise<void>;
  save(payload: unknown): Promise<void>;
  getHistory(): Promise<unknown[]>;
  clearHistory(): Promise<void>;
  removeById(id: string): Promise<void>;
  removeByThreatId(threatId: string): Promise<void>;
  getAllNotifPreferences(): Promise<StoredNotifPreferences[]>;
}
