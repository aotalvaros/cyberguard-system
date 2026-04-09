import { Injectable, Optional, Inject, InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WebSocketRepository, ConnectionStatus } from '../../domain/ports/websocket.repository';
import { AlertMessage } from '../../domain/models/alert-message.model';
import { WebSocketCommand } from '../../domain/models/websocket-command.model';
import { environment } from '@environments/environment';
import { STORAGE_KEYS, WS_COMMANDS, LIMITS } from '@environments/constants';

export type WebSocketFactory = (url: string) => WebSocket;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const defaultStorageAdapter: StorageAdapter = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
};

export const defaultWebSocketFactory: WebSocketFactory = (url: string) => new WebSocket(url);

export const WS_FACTORY_TOKEN = new InjectionToken<WebSocketFactory>('WebSocketFactory');
export const STORAGE_ADAPTER_TOKEN = new InjectionToken<StorageAdapter>('StorageAdapter');

@Injectable({ providedIn: 'root' })
export class WebSocketRepositoryImpl extends WebSocketRepository {
  private ws: WebSocket | null = null;
  private messages$ = new BehaviorSubject<AlertMessage[]>([]);
  private readonly WS_URL = environment.wsUrl;
  private readonly STORAGE_KEY = STORAGE_KEYS.WS_HISTORY;
  private readonly MAX_MESSAGES = LIMITS.MAX_WS_MESSAGES;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private connected = false;
  readonly connectionStatus$ = new BehaviorSubject<ConnectionStatus>('DISCONNECTED');

  protected wsFactory: WebSocketFactory;
  protected storage: StorageAdapter;

  constructor(
    @Optional() @Inject(WS_FACTORY_TOKEN) wsFactory?: WebSocketFactory,
    @Optional() @Inject(STORAGE_ADAPTER_TOKEN) storage?: StorageAdapter
  ) {
    super();
    this.wsFactory = wsFactory ?? defaultWebSocketFactory;
    this.storage = storage ?? defaultStorageAdapter;
    this.loadFromStorage();
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    // Reset reconnect attempts on explicit connect() call
    this.clearReconnect();
    this.connectionStatus$.next('CONNECTING');

    try {
      this.ws = this.wsFactory(this.WS_URL);

      this.ws.onopen = () => {
        this.connected = true;
        this.clearReconnect();
        this.connectionStatus$.next('CONNECTED');
        console.log('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.log('WebSocket disconnected');
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.clearReconnect();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connectionStatus$.next('DISCONNECTED');
  }

  sendCommand(command: WebSocketCommand): void {
    // Always update local state + localStorage, regardless of WebSocket connection
    if (command.type === WS_COMMANDS.CLEAR_ALL) {
      this.messages$.next([]);
      this.saveToStorage([]);
    } else if (command.type === WS_COMMANDS.DELETE_ONE && command.id) {
      const current = this.messages$.value;
      const filtered = current.filter(
        m => m.eventId !== command.id && m.data?.threatId !== command.id
      );
      this.messages$.next(filtered);
      this.saveToStorage(filtered);
    }

    // Send via WebSocket only when connected (for Redis cleanup via worker)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
    }
  }

  getMessages$(): Observable<AlertMessage[]> {
    return this.messages$.asObservable();
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConnectionStatus$(): Observable<ConnectionStatus> {
    return this.connectionStatus$.asObservable();
  }

  protected handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      // Handle clear-all broadcast from worker
      if (message.type === WS_COMMANDS.CLEAR_ALL) {
        this.messages$.next([]);
        this.saveToStorage([]);
        return;
      }

      // Handle delete-one broadcast from worker (triggered by threat.deleted RabbitMQ event)
      if (message.type === WS_COMMANDS.DELETE_ONE && message.id) {
        const current = this.messages$.value;
        const filtered = current.filter(
          m => m.eventId !== message.id && m.data?.threatId !== message.id
        );
        if (filtered.length !== current.length) {
          this.messages$.next(filtered);
          this.saveToStorage(filtered);
        }
        return;
      }

      if (message.data && message.data.eventId && message.data.data) {
        const alert: AlertMessage = {
          eventId: message.data.eventId,
          data: message.data.data,
          timestamp: Date.now()
        };
        this.addMessage(alert);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  protected addMessage(message: AlertMessage): void {
    const current = this.messages$.value;

    const exists = current.some(m =>
      m.eventId === message.eventId ||
      (m.data?.threatId && message.data?.threatId && m.data.threatId === message.data.threatId)
    );

    if (!exists) {
      const updated = [message, ...current].slice(0, this.MAX_MESSAGES);
      this.messages$.next(updated);
      this.saveToStorage(updated);
    }
  }

  protected scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.MAX_RECONNECT_ATTEMPTS) {
      this.connectionStatus$.next('ERROR');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30000);
    this.reconnectAttempt++;
    this.connectionStatus$.next('CONNECTING');
    this.reconnectTimeout = setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect();
    }, delay);
  }

  protected clearReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempt = 0;
  }

  protected loadFromStorage(): void {
    try {
      const stored = this.storage.getItem(this.STORAGE_KEY);
      if (stored) {
        const messages: AlertMessage[] = JSON.parse(stored);

        const validMessages = messages.filter((m: AlertMessage) =>
          m.eventId && m.data && m.data.threatId
        );
        this.messages$.next(validMessages);
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }

  protected saveToStorage(messages: AlertMessage[]): void {
    try {
      this.storage.setItem(this.STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  }
}
