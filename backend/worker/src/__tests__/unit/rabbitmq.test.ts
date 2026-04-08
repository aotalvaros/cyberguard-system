import { describe, it, expect, jest, afterEach, beforeEach } from '@jest/globals';
import type * as amqp from 'amqplib';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('../../logger', () => ({
  logger: mockLogger
}));

jest.mock('../../config', () => ({
  RABBITMQ_URL: 'amqp://localhost',
  EXCHANGE: 'test.exchange',
  TOPIC: '#'
}));

const mockAck = jest.fn();
const mockNack = jest.fn();
const mockAssertExchange = jest.fn().mockResolvedValue({ exchange: 'test.exchange' } as never);
const mockAssertQueue = jest.fn().mockResolvedValue({ queue: 'test-queue' } as never);
const mockBindQueue = jest.fn().mockResolvedValue(undefined as never);
const mockConsume = jest.fn().mockResolvedValue({ consumerTag: 'tag-1' } as never);
const mockChannelClose = jest.fn().mockResolvedValue(undefined as never);

const mockCreateChannel = jest.fn();
const mockConnectionClose = jest.fn().mockResolvedValue(undefined as never);
const mockConnectionOn = jest.fn();

const mockConnect = jest.fn();

jest.mock('amqplib', () => ({
  connect: mockConnect
}));

import { connectAndConsume, closeRabbit } from '../../rabbitmq';

interface MockMessage {
  content: Buffer;
  fields: { routingKey: string };
}

type MessageHandler = (msg: amqp.ConsumeMessage | null) => void | Promise<void>;

describe('RabbitMQ Module', () => {
  const onMessage = jest.fn().mockResolvedValue(undefined as never) as never

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    const channelMock = {
      assertExchange: mockAssertExchange,
      assertQueue: mockAssertQueue,
      bindQueue: mockBindQueue,
      consume: mockConsume,
      ack: mockAck,
      nack: mockNack,
      close: mockChannelClose
    } as never

    mockCreateChannel.mockResolvedValue(channelMock);

    mockConnect.mockResolvedValue({
      createChannel: mockCreateChannel,
      close: mockConnectionClose,
      on: mockConnectionOn
    } as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  
  
  

  describe('connectAndConsume', () => {
    it('should connect to RabbitMQ', async () => {
      await connectAndConsume(onMessage);

      expect(mockConnect).toHaveBeenCalledWith('amqp://localhost');
    });

    it('should create a channel', async () => {
      await connectAndConsume(onMessage);

      expect(mockCreateChannel).toHaveBeenCalledTimes(1);
    });

    it('should assert topic exchange', async () => {
      await connectAndConsume(onMessage);

      expect(mockAssertExchange).toHaveBeenCalledWith('test.exchange', 'topic', { durable: true });
    });

    it('should assert an exclusive queue', async () => {
      await connectAndConsume(onMessage);

      expect(mockAssertQueue).toHaveBeenCalledWith('', { exclusive: true });
    });

    it('should bind queue to exchange with topic', async () => {
      await connectAndConsume(onMessage);

      expect(mockBindQueue).toHaveBeenCalledWith('test-queue', 'test.exchange', '#');
    });

    it('should start consuming with noAck: false', async () => {
      await connectAndConsume(onMessage);

      expect(mockConsume).toHaveBeenCalledWith(
        'test-queue',
        expect.any(Function),
        { noAck: false }
      );
    });

    it('should log consumer bound info', async () => {
      await connectAndConsume(onMessage);

      expect(mockLogger.info).toHaveBeenCalledWith('RabbitMQ consumer bound', {
        exchange: 'test.exchange',
        queue: 'test-queue',
        topic: '#'
      });
    });

    it('should register connection error handler', async () => {
      await connectAndConsume(onMessage);

      expect(mockConnectionOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should register connection close handler for reconnection', async () => {
      await connectAndConsume(onMessage);

      expect(mockConnectionOn).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should retry connection on failure after 2 seconds', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection refused') as never);

      await connectAndConsume(onMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'Connection refused' }
      );
    });

    it('should handle non-Error connection failures', async () => {
      mockConnect.mockRejectedValueOnce('string error' as never);

      await connectAndConsume(onMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'Unknown error' }
      );
    });

    it('should call connect exactly once on successful connection', async () => {
      await connectAndConsume(onMessage);

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should call assertExchange before assertQueue', async () => {
      const callOrder: string[] = [];
      mockAssertExchange.mockImplementation(() => {
        callOrder.push('assertExchange');
        return Promise.resolve({ exchange: 'test.exchange' });
      });
      mockAssertQueue.mockImplementation(() => {
        callOrder.push('assertQueue');
        return Promise.resolve({ queue: 'test-queue' });
      });

      await connectAndConsume(onMessage);

      expect(callOrder.indexOf('assertExchange')).toBeLessThan(
        callOrder.indexOf('assertQueue')
      );
    });

    it('should call bindQueue after assertQueue', async () => {
      const callOrder: string[] = [];
      mockAssertQueue.mockImplementation(() => {
        callOrder.push('assertQueue');
        return Promise.resolve({ queue: 'test-queue' });
      });
      mockBindQueue.mockImplementation(() => {
        callOrder.push('bindQueue');
        return Promise.resolve(undefined);
      });

      await connectAndConsume(onMessage);

      expect(callOrder.indexOf('assertQueue')).toBeLessThan(
        callOrder.indexOf('bindQueue')
      );
    });

    it('should call consume after bindQueue', async () => {
      const callOrder: string[] = [];
      mockBindQueue.mockImplementation(() => {
        callOrder.push('bindQueue');
        return Promise.resolve(undefined);
      });
      mockConsume.mockImplementation(() => {
        callOrder.push('consume');
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);

      expect(callOrder.indexOf('bindQueue')).toBeLessThan(
        callOrder.indexOf('consume')
      );
    });

    it('should log error when connection error handler is triggered', async () => {
      const eventHandlers: Record<string, any> = {};
      mockConnectionOn.mockImplementation((...args: any[]) => {
        eventHandlers[args[0]] = args[1];
      });

      await connectAndConsume(onMessage);

      const errorHandler = eventHandlers['error'];
      expect(errorHandler).toBeDefined();

      const testError = new Error('Connection lost');
      errorHandler(testError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'RabbitMQ connection error',
        { error: 'Connection lost' }
      );
    });

    it('should attempt reconnection when close handler is triggered', async () => {
      const eventHandlers: Record<string, any> = {};
      mockConnectionOn.mockImplementation((...args: any[]) => {
        eventHandlers[args[0]] = args[1];
      });

      await connectAndConsume(onMessage);

      mockConnect.mockClear();

      const closeHandler = eventHandlers['close'];
      expect(closeHandler).toBeDefined();

      closeHandler();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'RabbitMQ connection closed, reconnecting in 2s'
      );

      
      jest.advanceTimersByTime(2000);
    });

    it('should handle channel creation failure', async () => {
      mockCreateChannel.mockRejectedValueOnce(new Error('Channel creation failed') as never);

      await connectAndConsume(onMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'Channel creation failed' }
      );
    });

    it('should handle assertExchange failure', async () => {
      mockAssertExchange.mockRejectedValueOnce(new Error('Exchange assertion failed') as never);

      await connectAndConsume(onMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'Exchange assertion failed' }
      );
    });

    it('should handle assertQueue failure', async () => {
      mockAssertQueue.mockRejectedValueOnce(new Error('Queue assertion failed') as never);

      await connectAndConsume(onMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'Queue assertion failed' }
      );
    });

    it('should handle bindQueue failure', async () => {
      mockBindQueue.mockRejectedValueOnce(new Error('Bind failed') as never);

      await connectAndConsume(onMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'Bind failed' }
      );
    });

    it('should handle consume setup failure', async () => {
      mockConsume.mockRejectedValueOnce(new Error('Consume setup failed') as never);

      await connectAndConsume(onMessage);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'Consume setup failed' }
      );
    });

    it('should not call assertQueue if assertExchange fails', async () => {
      mockAssertExchange.mockRejectedValueOnce(new Error('Exchange error') as never);

      await connectAndConsume(onMessage);

      expect(mockAssertQueue).not.toHaveBeenCalled();
    });

    it('should not call consume if bindQueue fails', async () => {
      mockBindQueue.mockRejectedValueOnce(new Error('Bind error') as never);

      await connectAndConsume(onMessage);

      expect(mockConsume).not.toHaveBeenCalled();
    });
  });

  
  
  

  describe('message processing', () => {
    beforeEach(() => {
      jest.useRealTimers();
    });

    afterEach(() => {
      jest.useFakeTimers();
    });

    it('should call onMessage with parsed data and routingKey', async () => {
      const messagePayload = { threatId: '123', type: 'malware' };
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify(messagePayload)),
        fields: { routingKey: 'threat.detected.malware' }
      };

      let capturedHandler: MessageHandler | undefined;
      mockConsume.mockImplementation((...args: any[]) => {
        capturedHandler = args[1] as MessageHandler;
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);

      await capturedHandler!(msg as amqp.ConsumeMessage);

      expect(onMessage).toHaveBeenCalledWith(
        messagePayload,
        'threat.detected.malware',
        msg
      );
    });

    it('should ack message after successful processing', async () => {
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify({ test: true })),
        fields: { routingKey: 'test.key' }
      };

      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(msg as amqp.ConsumeMessage);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockAck).toHaveBeenCalledWith(msg);
    });

    it('should nack message when processing fails', async () => {
      const failingOnMessage = jest.fn().mockRejectedValue(new Error('Processing failed') as never) as never;
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify({ test: true })),
        fields: { routingKey: 'test.key' }
      };

      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(msg as amqp.ConsumeMessage);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(failingOnMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockNack).toHaveBeenCalledWith(msg, false, false);
    });

    it('should nack message when JSON parse fails', async () => {
      const msg: MockMessage = {
        content: Buffer.from('not-valid-json'),
        fields: { routingKey: 'test.key' }
      };

      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(msg as amqp.ConsumeMessage);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockNack).toHaveBeenCalledWith(msg, false, false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing RabbitMQ message',
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should ignore null messages', async () => {
      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(null);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(onMessage).not.toHaveBeenCalled();
    });

    it('should not ack null messages', async () => {
      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(null);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockAck).not.toHaveBeenCalled();
    });

    it('should not nack null messages', async () => {
      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(null);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockNack).not.toHaveBeenCalled();
    });

    it('should parse complex nested JSON payloads correctly', async () => {
      const complexPayload = {
        threatId: 'complex-1',
        metadata: {
          severity: 'critical',
          tags: ['apt', 'ransomware'],
          nested: { deep: { value: 42 } }
        },
        timestamp: '2024-01-01T00:00:00.000Z'
      };
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify(complexPayload)),
        fields: { routingKey: 'threat.complex' }
      };

      let capturedHandler: MessageHandler | undefined;
      mockConsume.mockImplementation((...args: any[]) => {
        capturedHandler = args[1] as MessageHandler;
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await capturedHandler!(msg as amqp.ConsumeMessage);

      expect(onMessage).toHaveBeenCalledWith(
        complexPayload,
        'threat.complex',
        msg
      );
    });

    it('should handle empty JSON object payload', async () => {
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify({})),
        fields: { routingKey: 'empty.payload' }
      };

      let capturedHandler: MessageHandler | undefined;
      mockConsume.mockImplementation((...args: any[]) => {
        capturedHandler = args[1] as MessageHandler;
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await capturedHandler!(msg as amqp.ConsumeMessage);

      expect(onMessage).toHaveBeenCalledWith({}, 'empty.payload', msg);
    });

    it('should log error details when onMessage rejects', async () => {
      const processingError = new Error('Handler crashed') as never
      const failingOnMessage = jest.fn().mockRejectedValue(processingError) as never
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify({ test: 'error-logging' })),
        fields: { routingKey: 'error.test' }
      };

      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(msg as amqp.ConsumeMessage);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(failingOnMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing RabbitMQ message',
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should nack without requeue when onMessage throws non-Error', async () => {
      const failingOnMessage = jest.fn().mockRejectedValue('string rejection' as never) as never;
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify({ test: 'non-error' })),
        fields: { routingKey: 'non.error' }
      };

      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(msg as amqp.ConsumeMessage);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(failingOnMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockNack).toHaveBeenCalledWith(msg, false, false);
    });

    it('should handle multiple messages sequentially', async () => {
      const messages: MockMessage[] = [
        {
          content: Buffer.from(JSON.stringify({ id: 1 })),
          fields: { routingKey: 'msg.first' }
        },
        {
          content: Buffer.from(JSON.stringify({ id: 2 })),
          fields: { routingKey: 'msg.second' }
        },
        {
          content: Buffer.from(JSON.stringify({ id: 3 })),
          fields: { routingKey: 'msg.third' }
        }
      ];

      let capturedHandler: MessageHandler | undefined;
      mockConsume.mockImplementation((...args: any[]) => {
        capturedHandler = args[1] as MessageHandler;
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);

      for (const msg of messages) {
        await capturedHandler!(msg as amqp.ConsumeMessage);
      }

      expect(onMessage).toHaveBeenCalledTimes(3);
      expect(onMessage).toHaveBeenNthCalledWith(1, { id: 1 }, 'msg.first', messages[0]);
      expect(onMessage).toHaveBeenNthCalledWith(2, { id: 2 }, 'msg.second', messages[1]);
      expect(onMessage).toHaveBeenNthCalledWith(3, { id: 3 }, 'msg.third', messages[2]);
    });

    it('should ack each message independently on success', async () => {
      const msg1: MockMessage = {
        content: Buffer.from(JSON.stringify({ id: 'a' })),
        fields: { routingKey: 'key.a' }
      };
      const msg2: MockMessage = {
        content: Buffer.from(JSON.stringify({ id: 'b' })),
        fields: { routingKey: 'key.b' }
      };

      let capturedHandler: MessageHandler | undefined;
      mockConsume.mockImplementation((...args: any[]) => {
        capturedHandler = args[1] as MessageHandler;
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);

      await capturedHandler!(msg1 as amqp.ConsumeMessage);
      await capturedHandler!(msg2 as amqp.ConsumeMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockAck).toHaveBeenCalledWith(msg1);
      expect(mockAck).toHaveBeenCalledWith(msg2);
    });

    it('should handle message with empty routing key', async () => {
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify({ data: 'test' })),
        fields: { routingKey: '' }
      };

      let capturedHandler: MessageHandler | undefined;
      mockConsume.mockImplementation((...args: any[]) => {
        capturedHandler = args[1] as MessageHandler;
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await capturedHandler!(msg as amqp.ConsumeMessage);

      expect(onMessage).toHaveBeenCalledWith({ data: 'test' }, '', msg);
    });

    it('should handle JSON array payload', async () => {
      const arrayPayload = [1, 2, 3];
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify(arrayPayload)),
        fields: { routingKey: 'array.payload' }
      };

      let capturedHandler: MessageHandler | undefined;
      mockConsume.mockImplementation((...args: any[]) => {
        capturedHandler = args[1] as MessageHandler;
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await capturedHandler!(msg as amqp.ConsumeMessage);

      expect(onMessage).toHaveBeenCalledWith(arrayPayload, 'array.payload', msg);
    });

    it('should handle empty buffer content gracefully', async () => {
      const msg: MockMessage = {
        content: Buffer.from(''),
        fields: { routingKey: 'empty.content' }
      };

      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(msg as amqp.ConsumeMessage);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await new Promise(resolve => setImmediate(resolve));

      
      expect(mockNack).toHaveBeenCalledWith(msg, false, false);
    });

    it('should handle ack failure gracefully', async () => {
      const msg: MockMessage = {
        content: Buffer.from(JSON.stringify({ test: true })),
        fields: { routingKey: 'test.key' }
      };

      mockAck.mockImplementationOnce(() => {
        throw new Error('Ack failed');
      });

      mockConsume.mockImplementation((...args: any[]) => {
        const handler = args[1] as MessageHandler;
        handler(msg as amqp.ConsumeMessage);
        return Promise.resolve({ consumerTag: 'tag-1' });
      });

      await connectAndConsume(onMessage);
      await new Promise(resolve => setImmediate(resolve));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to ack message',
        expect.objectContaining({ error: 'Ack failed' })
      );
    });
  });

  
  
  

  describe('closeRabbit', () => {
    it('should close channel and connection', async () => {
      await connectAndConsume(onMessage);

      await closeRabbit();

      expect(mockChannelClose).toHaveBeenCalled();
      expect(mockConnectionClose).toHaveBeenCalled();
    });

    it('should not throw when connection is null', async () => {
      await expect(closeRabbit()).resolves.toBeUndefined();
    });

    it('should close channel before connection', async () => {
      const callOrder: string[] = [];
      mockChannelClose.mockImplementation(() => {
        callOrder.push('channelClose');
        return Promise.resolve(undefined);
      });
      mockConnectionClose.mockImplementation(() => {
        callOrder.push('connectionClose');
        return Promise.resolve(undefined);
      });

      await connectAndConsume(onMessage);

      await closeRabbit();

      expect(callOrder.indexOf('channelClose')).toBeLessThan(
        callOrder.indexOf('connectionClose')
      );
    });

    it('should handle channel close error gracefully', async () => {
      mockChannelClose.mockRejectedValueOnce(new Error('Channel close error') as never);

      await connectAndConsume(onMessage);

      
      await expect(closeRabbit()).resolves.toBeUndefined();
    });

    it('should handle connection close error gracefully', async () => {
      mockConnectionClose.mockRejectedValueOnce(new Error('Connection close error') as never);

      await connectAndConsume(onMessage);

      await expect(closeRabbit()).resolves.toBeUndefined();
    });
    it('should be idempotent when called multiple times', async () => {
      await connectAndConsume(onMessage);

      await closeRabbit();
      await closeRabbit();

      
      expect(mockChannelClose).toHaveBeenCalled();
    });
  });
});