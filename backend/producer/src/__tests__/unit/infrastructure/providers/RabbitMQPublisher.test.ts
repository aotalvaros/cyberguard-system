import { describe, it, expect, jest, beforeEach } from '@jest/globals';


// Mocks first
jest.mock('../../../../infrastructure/config/rabbitmq', () => ({
  publishEvent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));



import { RabbitMQPublisher } from '../../../../infrastructure/providers/RabbitMQPublisher';
import { publishEvent } from '../../../../infrastructure/config/rabbitmq';
import { logger } from '../../../../infrastructure/config/logger';

describe('RabbitMQPublisher', () => {
  let publisher: RabbitMQPublisher;

  beforeEach(() => {
    jest.clearAllMocks();
    publisher = new RabbitMQPublisher();
  });

  describe('Successful Publishing', () => {
    it('should publish event with correct routing key and payload', async () => {
      const routingKey = 'threat.detected.malware';
      const event = {
        eventId: 'event-123',
        eventType: 'threat.detected',
        timestamp: '2026-02-01T00:00:00.000Z',
        data: {
          threatId: 'threat-456',
          type: 'malware',
          severity: 'high'
        }
      };

      await publisher.publish(routingKey, event);

      expect(publishEvent).toHaveBeenCalledTimes(1);
      expect(publishEvent).toHaveBeenCalledWith(routingKey, event);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should publish event with different routing key', async () => {
      const routingKey = 'threat.detected.phishing';
      const event = {
        eventId: 'event-789',
        eventType: 'threat.detected',
        data: { type: 'phishing' }
      };

      await publisher.publish(routingKey, event);

      expect(publishEvent).toHaveBeenCalledWith(routingKey, event);
    });

    it('should handle empty event object', async () => {
      const routingKey = 'test.routing.key';
      const event = {};

      await publisher.publish(routingKey, event);

      expect(publishEvent).toHaveBeenCalledWith(routingKey, event);
    });

    it('should publish multiple events sequentially', async () => {
      const events = [
        { routingKey: 'key1', event: { id: '1' } },
        { routingKey: 'key2', event: { id: '2' } },
        { routingKey: 'key3', event: { id: '3' } }
      ];

      for (const { routingKey, event } of events) {
        await publisher.publish(routingKey, event);
      }

      expect(publishEvent).toHaveBeenCalledTimes(3);
      expect(publishEvent).toHaveBeenNthCalledWith(1, 'key1', { id: '1' });
      expect(publishEvent).toHaveBeenNthCalledWith(2, 'key2', { id: '2' });
      expect(publishEvent).toHaveBeenNthCalledWith(3, 'key3', { id: '3' });
    });
  });

  describe('Error Handling', () => {
    it('should log error and rethrow when publishEvent fails', async () => {
      const routingKey = 'threat.detected.ransomware';
      const event = {
        eventId: 'event-error',
        data: { type: 'ransomware' }
      };
      const error = new Error('RabbitMQ connection failed');

      (publishEvent as jest.Mock).mockRejectedValueOnce(error as never);

      await expect(publisher.publish(routingKey, event)).rejects.toThrow(
        'RabbitMQ connection failed'
      );

      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish event to RabbitMQ',
        {
          routingKey,
          error: error.message
        }
      );
    });

    it('should log error with correct routing key when publish fails', async () => {
      const routingKey = 'custom.routing.key';
      const event = { data: 'test' };
      const error = new Error('Network timeout');

      (publishEvent as jest.Mock).mockRejectedValueOnce(error as never);

      await expect(publisher.publish(routingKey, event)).rejects.toThrow('Network timeout');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish event to RabbitMQ',
        {
          routingKey: 'custom.routing.key',
          error: 'Network timeout'
        }
      );
    });

    it('should handle error without message property', async () => {
      const routingKey = 'test.key';
      const event = { test: 'data' };
      const error = { code: 'ECONNREFUSED' };

      (publishEvent as jest.Mock).mockRejectedValueOnce(error as never);

      await expect(publisher.publish(routingKey, event)).rejects.toEqual(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish event to RabbitMQ',
        {
          routingKey,
          error: '[object Object]'
        }
      );
    });

    it('should propagate NACK errors from RabbitMQ confirms', async () => {
      const routingKey = 'threat.detected.ddos';
      const event = { eventId: 'nack-test', data: { type: 'ddos' } };
      const error = new Error('Message was NACK by broker');

      (publishEvent as jest.Mock).mockRejectedValueOnce(error as never);

      await expect(publisher.publish(routingKey, event)).rejects.toThrow(
        'Message was NACK by broker'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to publish event to RabbitMQ',
        {
          routingKey,
          error: 'Message was NACK by broker'
        }
      );
    });
  });

  describe('EventPublisher Interface', () => {
    it('should implement publish method', () => {
      expect(typeof publisher.publish).toBe('function');
    });

    it('should return a Promise', () => {
      const result = publisher.publish('test.key', { test: true });
      expect(result).toBeInstanceOf(Promise);
    });
  });
});