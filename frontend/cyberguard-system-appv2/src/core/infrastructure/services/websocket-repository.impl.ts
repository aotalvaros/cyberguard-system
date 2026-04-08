import { Injectable, Optional, Inject, InjectionToken } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WebSocketRepository } from '../../domain/ports/websocket.repository';
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
  private reconnectInterval: ReturnType<typeof setInterval> | null = null;
  private connected = false;

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

    try {
      this.ws = this.wsFactory(this.WS_URL);

      this.ws.onopen = () => {
        this.connected = true;
        console.log('WebSocket connected');
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
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
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  sendCommand(command: WebSocketCommand): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
      
      if (command.type === WS_COMMANDS.CLEAR_ALL) {
        this.messages$.next([]);
        this.saveToStorage([]);
      } else if (command.type === WS_COMMANDS.DELETE_ONE && command.id) {
        const current = this.messages$.value;
        const filtered = current.filter(m => m.eventId !== command.id);
        this.messages$.next(filtered);
        this.saveToStorage(filtered);
      }
    }
  }

  getMessages$(): Observable<AlertMessage[]> {
    return this.messages$.asObservable();
  }

  isConnected(): boolean {
    return this.connected;
  }


  protected handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'delete-one' && typeof message.id === 'string') {
        const current = this.messages$.value;
        const filtered = current.filter(m => m.eventId !== message.id);
        if (filtered.length !== current.length) {
          this.messages$.next(filtered);
          this.saveToStorage(filtered);
        }
        return;
      }

      if (message.type === 'clear-all') {
        this.messages$.next([]);
        this.saveToStorage([]);
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
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        console.log('Attempting to reconnect...');
        this.connect();
      }, 2000);
    }
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
