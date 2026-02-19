export interface EventPublisher {
  publish(routingKey: string, event: Record<string, unknown>): Promise<void>;
}