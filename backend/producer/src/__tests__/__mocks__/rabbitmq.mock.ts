import { jest } from '@jest/globals';

export const mockChannel = {
  publish: jest.fn().mockReturnValue(true),
  assertExchange: jest.fn().mockResolvedValue(undefined),
  assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
  bindQueue: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
};

export const mockConnection = {
  createChannel: jest.fn().mockResolvedValue(mockChannel),
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined)
};

export const createRabbitMQMock = () => ({
  connectRabbitMQ: jest.fn().mockResolvedValue(undefined),
  getChannel: jest.fn().mockReturnValue(mockChannel),
  publishEvent: jest.fn().mockResolvedValue(undefined),
  closeRabbitMQ: jest.fn().mockResolvedValue(undefined)
});