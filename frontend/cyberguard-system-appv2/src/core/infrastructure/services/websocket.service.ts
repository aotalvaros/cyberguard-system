import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WebSocketRepository, ConnectionStatus } from '../../domain/ports/websocket.repository';
import { AlertMessage } from '../../domain/models/alert-message.model';
import { WS_COMMANDS } from '@environments/constants';

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
    this.wsRepository.sendCommand({ type: WS_COMMANDS.CLEAR_ALL });
  }

  deleteMessage(eventId: string): void {
    this.wsRepository.sendCommand({ type: WS_COMMANDS.DELETE_ONE, id: eventId });
  }

  isConnected(): boolean {
    return this.wsRepository.isConnected();
  }

  getConnectionStatus$(): Observable<ConnectionStatus> {
    return this.wsRepository.getConnectionStatus$();
  }
}
