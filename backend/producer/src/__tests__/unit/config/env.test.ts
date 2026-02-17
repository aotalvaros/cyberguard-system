import { describe, it, expect, jest, beforeEach, afterEach, afterAll } from '@jest/globals';

describe('Environment Configuration', () => {
  const originalEnv = process.env;
  let mockProcessExit: jest.SpiedFunction<typeof process.exit>;

  const mockLogger = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    mockProcessExit = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit called');
    }) as any);

    // Limpiar variables que puedan venir del .env real
    delete process.env.PORT;
    delete process.env.RABBITMQ_URL;
    delete process.env.JWT_SECRET;
    delete process.env.FIREBASE_API_KEY;
    delete process.env.FIREBASE_AUTH_DOMAIN;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
    mockProcessExit.mockRestore();
  });

  afterAll(() => {
    mockProcessExit.mockRestore();
  });

  describe('Required Environment Variables - Success Cases', () => {
    it('should load config when all required variables are present', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';

      // Mock logger ANTES de importar env
      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.port).toBe(3000);
      expect(config.rabbitmqUrl).toBe('amqp://localhost:5672');
      expect(config.jwtSecret).toBe('test-secret');
      expect(mockProcessExit).not.toHaveBeenCalled();

    });

    it('should parse custom port number', async () => {
      // Arrange
      process.env.PORT = '8080';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';


      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.port).toBe(8080);
    });

    it('should parse allowed origins from comma-separated string', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.ALLOWED_ORIGINS = 'http://localhost:4200,http://localhost:3000,https://example.com';

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.allowedOrigins).toEqual([
        'http://localhost:4200',
        'http://localhost:3000',
        'https://example.com'
      ]);
    });

    it('should default allowedOrigins to localhost:4200 when not set', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      // ALLOWED_ORIGINS not set

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.allowedOrigins).toEqual(['http://localhost:4200']);
    });

    it('should default nodeEnv to development when not set', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      // NODE_ENV not set

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.nodeEnv).toBe('development');
    });

    it('should use production nodeEnv when set', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.NODE_ENV = 'production';

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.nodeEnv).toBe('production');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single allowed origin', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.ALLOWED_ORIGINS = 'https://production.example.com';

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.allowedOrigins).toEqual(['https://production.example.com']);
    });

    it('should handle RabbitMQ URL with credentials', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://user:password@rabbitmq:5672/vhost';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.rabbitmqUrl).toBe('amqp://user:password@rabbitmq:5672/vhost');
    });

    it('should handle special characters in JWT secret', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'super$ecret!@#key_2024';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert
      expect(config.jwtSecret).toBe('super$ecret!@#key_2024');
    });

    it('should handle whitespace in allowed origins (no trimming)', async () => {
      // Arrange
      process.env.PORT = '3000';
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';
      process.env.ALLOWED_ORIGINS = 'http://localhost:4200, http://localhost:3000';

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert - Note: spaces are NOT trimmed by split(',')
      expect(config.allowedOrigins).toEqual([
        'http://localhost:4200',
        ' http://localhost:3000'  // Leading space preserved
      ]);
    });

    it('should parse port as integer not float', async () => {
      // Arrange
      process.env.PORT = '3000.5';  // Invalid but parseInt handles it
      process.env.RABBITMQ_URL = 'amqp://localhost:5672';
      process.env.JWT_SECRET = 'test-secret';
      process.env.FIREBASE_API_KEY = '111aaa';
      process.env.FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com';
      process.env.FIREBASE_PROJECT_ID = 'test-project';

      jest.unstable_mockModule('../../../config/logger', () => ({
        logger: mockLogger
      }));

      // Act
      const { config } = await import('../../../config/env');

      // Assert - parseInt truncates decimal
      expect(config.port).toBe(3000);
    });
  });
});