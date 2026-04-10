import { describe, it, expect, jest, afterEach, beforeEach } from '@jest/globals';
import type * as amqp from 'amqplib';
import { RabbitMQConsumer } from '../../infrastructure/messaging/RabbitMQConsumer';

jest.mock('../../infrastructure/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../infrastructure/logging';
const mockLogger = logger as unknown as Record<string, jest.Mock>;

jest.mock('../../infrastructure/config', () => ({
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

// mockConnect se define como variable de módulo y se referencia en jest.mock
// Usar jest.fn directamente dentro del factory para evitar TDZ
jest.mock('amqplib', () => {
  const connect = jest.fn();
  return { connect };
});

// Importar y capturar la referencia mockeada
import amqplib from 'amqplib';
const mockConnect = amqplib.connect as jest.Mock;

interface MockMessage {
  content: Buffer;
  fields: { routingKey: string };
}

type MessageHandler = (msg: amqp.ConsumeMessage | null) => void | Promise<void>;

describe('RabbitMQConsumer', () => {
  let consumer: RabbitMQConsumer;
  const onMessage = jest.fn().mockResolvedValue(undefined as never) as never;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consumer = new RabbitMQConsumer();

    const channelMock = {
      assertExchange: mockAssertExchange,
      assertQueue: mockAssertQueue,
      bindQueue: mockBindQueue,
      consume: mockConsume,
      ack: mockAck,
      nack: mockNack,
      close: mockChannelClose
    } as never;

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

  it('should connect and setup consumer', async () => {
    await consumer.consume(onMessage);

    expect(mockConnect).toHaveBeenCalledWith('amqp://localhost');
    expect(mockAssertExchange).toHaveBeenCalledWith('test.exchange', 'topic', { durable: true });
    expect(mockAssertQueue).toHaveBeenCalledWith('', { exclusive: true });
    expect(mockBindQueue).toHaveBeenCalledWith('test-queue', 'test.exchange', '#');
  });

  it('should process message and ack on success', async () => {
    const msg: MockMessage = {
      content: Buffer.from(JSON.stringify({ test: true })),
      fields: { routingKey: 'test.key' }
    };

    let capturedHandler: MessageHandler | undefined;
    mockConsume.mockImplementation((...args: any[]) => {
      capturedHandler = args[1] as MessageHandler;
      return Promise.resolve({ consumerTag: 'tag-1' });
    });

    await consumer.consume(onMessage);
    await capturedHandler!(msg as amqp.ConsumeMessage);

    expect(onMessage).toHaveBeenCalledWith({ test: true }, 'test.key', msg);
    expect(mockAck).toHaveBeenCalledWith(msg);
  });

  it('should nack on processing failure', async () => {
    const failingOnMessage = jest.fn().mockRejectedValue(new Error('Processing failed') as never) as never;
    const msg: MockMessage = {
      content: Buffer.from(JSON.stringify({ test: true })),
      fields: { routingKey: 'test.key' }
    };

    let capturedHandler: MessageHandler | undefined;
    mockConsume.mockImplementation((...args: any[]) => {
      capturedHandler = args[1] as MessageHandler;
      return Promise.resolve({ consumerTag: 'tag-1' });
    });

    await consumer.consume(failingOnMessage);
    await capturedHandler!(msg as amqp.ConsumeMessage);

    expect(mockNack).toHaveBeenCalledWith(msg, false, false);
  });

  it('should reconnect on initial connection failure', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Connection refused') as never);

    await consumer.consume(onMessage);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to connect to RabbitMQ',
      { error: 'Connection refused' }
    );
  });

  it('should close channel and connection', async () => {
    await consumer.consume(onMessage);
    await consumer.close();

    expect(mockChannelClose).toHaveBeenCalled();
    expect(mockConnectionClose).toHaveBeenCalled();
  });
});