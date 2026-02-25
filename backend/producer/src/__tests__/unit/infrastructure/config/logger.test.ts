/**
 * Unit Tests: logger.ts
 *
 * VERIFICAR: El logger exportado tiene los métodos esperados de Winston.
 * VERIFICAR: El nivel de log se adapta según NODE_ENV.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('logger.ts', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  describe('Logger instance', () => {
    it('should export a logger object', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(logger).toBeDefined();
    });

    it('should have an info() method', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(typeof logger.info).toBe('function');
    });

    it('should have an error() method', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(typeof logger.error).toBe('function');
    });

    it('should have a warn() method', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(typeof logger.warn).toBe('function');
    });

    it('should have a debug() method', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Log level based on NODE_ENV', () => {
    it('should use "debug" level in development (default)', async () => {
      jest.resetModules();
      process.env.NODE_ENV = 'development';
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(logger.level).toBe('debug');
    });

    it('should use "info" level in production', async () => {
      jest.resetModules();
      process.env.NODE_ENV = 'production';
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(logger.level).toBe('info');
    });

    it('should default to "debug" level when NODE_ENV is not set', async () => {
      jest.resetModules();
      delete process.env.NODE_ENV;
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(logger.level).toBe('debug');
    });
  });

  describe('Logger methods do not throw', () => {
    it('should call info() without throwing', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(() => logger.info('test info message')).not.toThrow();
    });

    it('should call error() without throwing', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(() => logger.error('test error message')).not.toThrow();
    });

    it('should call warn() without throwing', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(() => logger.warn('test warn message')).not.toThrow();
    });

    it('should call debug() without throwing', async () => {
      const { logger } = await import('../../../../infrastructure/config/logger');
      expect(() => logger.debug('test debug message', { extra: 'data' })).not.toThrow();
    });
  });
});
