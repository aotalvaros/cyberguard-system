import { jest } from '@jest/globals';

export const mockChannel = {
  publish: jest.fn().mockReturnValue(true),
  assertExchange: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  assertQueue: jest.fn<() => Promise<{ queue: string }>>().mockResolvedValue({ queue: 'test-queue' }),
  bindQueue: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
};

export const mockConnection = {
  createChannel: jest.fn<() => any>().mockReturnValue(mockChannel),
  on: jest.fn(),
  close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
};

export const createRabbitMQMock = () => ({
connectRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getChannel: jest.fn<() => any>().mockReturnValue(mockChannel),
  publishEvent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  closeRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
});