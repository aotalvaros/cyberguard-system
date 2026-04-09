/**
 * Puerto de broadcast de eventos en tiempo real.
 * Abstrae el canal de difusión hacia clientes conectados (WebSocket).
 */
export interface IBroadcaster {
  start(port: number): unknown;
  broadcast(payload: unknown): void;
  close(): Promise<void>;
}
