import { jest, beforeEach, afterEach} from '@jest/globals';

// ✅ CONFIGURAR ENV VARS GLOBALES PARA TODOS LOS TESTS
process.env.PORT = process.env.PORT || '3000';
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'fake-key-for-tests';
process.env.FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com';
process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'test-project-for-tests';
process.env.NODE_ENV = 'test';

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Ensure clean state after each test
afterEach(() => {
  jest.resetModules();
});