import { Injectable, NgZone } from '@angular/core';
import { Observable, BehaviorSubject, timer } from 'rxjs';
import { filter, retryWhen, switchMap, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class WsService {
  private socket: WebSocket | null = null;
  private connected = false;
  private url = (window as any).__env?.WORKER_WS_URL || 'ws://localhost:8081';

  // keep an in-memory history of recent messages and expose as observable
  private historyCapacity = Number((window as any).__env?.WORKER_HISTORY_CAPACITY) || 200;
  private history: any[] = [];
  private messagesSubject = new BehaviorSubject<any[]>([]);
  private storageKey = 'cg_ws_history';
  private seenIds = new Set<string>();

  get messages$(): Observable<any[]> {
    return this.messagesSubject.asObservable();
  }

  // load persisted client-side history so refresh keeps notifications
  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        // populate seenIds to avoid duplicates when server replays history on connect
        this.history = [];
        for (const item of arr) {
          const id = this.getMessageId(item);
          if (!id) continue;
          if (!this.seenIds.has(id)) {
            this.seenIds.add(id);
            this.history.push(item);
            if (this.history.length >= this.historyCapacity) break;
          }
        }
        console.debug('WsService: loaded history from localStorage', { count: this.history.length });
      }
    } catch (e) {
      // ignore malformed storage
    }
  }

  private persistToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.history.slice(0, this.historyCapacity)));
    } catch {
      // ignore storage failures
    }
  }

  private getMessageId(payload: any): string | null {
    if (!payload) return null;
    // common explicit id
    if (payload.eventId && typeof payload.eventId === 'string') return payload.eventId;
    // nested data id
    if (payload.data && payload.data.threatId && typeof payload.data.threatId === 'string') return payload.data.threatId;
    // fallback to combination of routingKey + timestamp
    if (payload.routingKey && payload.receivedAt) return `${payload.routingKey}::${payload.receivedAt}`;
    if (payload.routing && payload.timestamp) return `${payload.routing}::${payload.timestamp}`;
    try {
      const s = JSON.stringify(payload);
      // use a short hash-like id from the string to keep it compact
      let h = 0;
      for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
      }
      return `hash:${h}`;
    } catch {
      return null;
    }
  }

  connect() {
    if (this.connected) return;
    this.createSocket();
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }

  private createSocket() {
    try {
      this.socket = new WebSocket(this.url);
    } catch (e) {
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.zone.run(() => { this.connected = true; });
    };

    this.socket.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        // keep newest first
        const id = this.getMessageId(parsed);
        if (id && this.seenIds.has(id)) {
          // duplicate, ignore
          return;
        }
        if (id) this.seenIds.add(id);
        this.history.unshift(parsed);
        if (this.history.length > this.historyCapacity) this.history.pop();
        this.persistToStorage();
        console.debug('WsService: received message', { total: this.history.length });
        this.zone.run(() => { this.messagesSubject.next([...this.history]); });
      } catch (e) {
        // ignore malformed messages
      }
    };

    this.socket.onclose = () => {
      this.connected = false;
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      // will trigger onclose soon
    };
  }

  private scheduleReconnect() {
    // simple backoff
    timer(2000).subscribe(() => this.createSocket());
  }

  send(obj: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    try {
      this.socket.send(JSON.stringify(obj));
    } catch {
      // swallow
    }
  }

  deleteMessage(index: number) {
    this.history.splice(index, 1);
    this.persistToStorage();
    this.messagesSubject.next([...this.history]);
  }

  clearAll() {
    this.history = [];
    this.seenIds.clear();
    this.persistToStorage();
    this.messagesSubject.next([]);
  }

  constructor(private zone: NgZone) {
    // Load from storage on service initialization
    this.loadFromStorage();
    if (this.history.length > 0) {
      this.messagesSubject.next([...this.history]);
    }
  }
}
