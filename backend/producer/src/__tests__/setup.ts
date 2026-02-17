import { jest } from '@jest/globals';

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Ensure clean state after each test
afterEach(() => {
  jest.resetModules();
});