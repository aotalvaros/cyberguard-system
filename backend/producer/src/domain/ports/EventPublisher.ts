export interface EventPublisher {
  publish(routingKey: string, event: any): Promise<void>;
}