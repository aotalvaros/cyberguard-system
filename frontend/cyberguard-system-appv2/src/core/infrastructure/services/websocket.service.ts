import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebSocketRepository } from '../../domain/ports/websocket.repository';
import { AlertMessage } from '../../domain/models/alert-message.model';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private wsRepository = inject(WebSocketRepository);

  connect(): void {
    this.wsRepository.connect();
  }

  disconnect(): void {
    this.wsRepository.disconnect();
  }

  getMessages$(): Observable<AlertMessage[]> {
    return this.wsRepository.getMessages$();
  }

  clearAll(): void {
    this.wsRepository.sendCommand({ type: 'clear-all' });
  }

  deleteMessage(eventId: string): void {
    this.wsRepository.sendCommand({ type: 'delete-one', id: eventId });
  }

  isConnected(): boolean {
    return this.wsRepository.isConnected();
  }
}
