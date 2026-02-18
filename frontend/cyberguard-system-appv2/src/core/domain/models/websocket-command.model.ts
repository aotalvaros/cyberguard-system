export interface WebSocketCommand {
  type: 'clear-all' | 'delete-one';
  id?: string;
}
