import { jest } from '@jest/globals';

export const createLoggerMock = () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
});