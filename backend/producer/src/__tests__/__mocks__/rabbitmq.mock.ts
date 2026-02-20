import { jest } from '@jest/globals';

export const mockPublishEvent = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

export const mockRabbitMQConnection = {
  connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  getChannel: jest.fn(),
  publishEvent: mockPublishEvent,
  close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
};

export const createRabbitMQMock = () => ({
  RabbitMQConnection: {
    getInstance: jest.fn(() => mockRabbitMQConnection),
    resetInstance: jest.fn(),
  },
  connectRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  publishEvent: mockPublishEvent,
  closeRabbitMQ: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
});