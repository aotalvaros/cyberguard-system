import { Observable } from 'rxjs';
import { AlertMessage } from '../models/alert-message.model';
import { WebSocketCommand } from '../models/websocket-command.model';

export abstract class WebSocketRepository {
  abstract connect(): void;
  abstract disconnect(): void;
  abstract sendCommand(command: WebSocketCommand): void;
  abstract getMessages$(): Observable<AlertMessage[]>;
  abstract isConnected(): boolean;
}
