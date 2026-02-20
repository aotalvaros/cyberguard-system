export interface WebSocketCommand {
  readonly type: 'clear-all' | 'delete-one';
  readonly id?: string;
}
