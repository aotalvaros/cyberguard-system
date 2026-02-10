import { Injectable } from '@angular/core';
import { Observable, Subject, timer } from 'rxjs';
import { filter, retryWhen, switchMap, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class WsService {
  private socket: WebSocket | null = null;
  private messages = new Subject<any>();
  private connected = false;
  private url = (window as any).__env?.WORKER_WS_URL || 'ws://localhost:8081';

  get messages$(): Observable<any> {
    return this.messages.asObservable();
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
      this.connected = true;
    };

    this.socket.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        this.messages.next(parsed);
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
}
