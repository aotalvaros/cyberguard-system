import { describe, it, expect, jest, afterAll, beforeEach } from '@jest/globals';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  
  
  

  describe('default values', () => {
    it('should default RABBITMQ_URL to amqp://localhost', () => {
      delete process.env.RABBITMQ_URL;
      const config = require('../../config');

      expect(config.RABBITMQ_URL).toBe('amqp://localhost');
    });

    it('should default REDIS_URL to redis://localhost:6379', () => {
      delete process.env.REDIS_URL;
      const config = require('../../config');

      expect(config.REDIS_URL).toBe('redis://localhost:6379');
    });

    it('should default WS_PORT to 8081', () => {
      delete process.env.WORKER_WS_PORT;
      const config = require('../../config');

      expect(config.WS_PORT).toBe(8081);
    });

    it('should default EXCHANGE to cyberguard.events', () => {
      delete process.env.WORKER_EXCHANGE;
      const config = require('../../config');

      expect(config.EXCHANGE).toBe('cyberguard.events');
    });

    it('should default TOPIC to #', () => {
      delete process.env.WORKER_TOPIC;
      const config = require('../../config');

      expect(config.TOPIC).toBe('#');
    });
  });

  
  
  

  describe('environment variable overrides', () => {
    it('should use RABBITMQ_URL from environment', () => {
      process.env.RABBITMQ_URL = 'amqp://prod-rabbit:5672';
      const config = require('../../config');

      expect(config.RABBITMQ_URL).toBe('amqp://prod-rabbit:5672');
    });

    it('should use REDIS_URL from environment', () => {
      process.env.REDIS_URL = 'redis://prod-redis:6379';
      const config = require('../../config');

      expect(config.REDIS_URL).toBe('redis://prod-redis:6379');
    });

    it('should use WORKER_WS_PORT from environment and convert to number', () => {
      process.env.WORKER_WS_PORT = '9090';
      const config = require('../../config');

      expect(config.WS_PORT).toBe(9090);
      expect(typeof config.WS_PORT).toBe('number');
    });

    it('should use WORKER_EXCHANGE from environment', () => {
      process.env.WORKER_EXCHANGE = 'custom.exchange';
      const config = require('../../config');

      expect(config.EXCHANGE).toBe('custom.exchange');
    });

    it('should use WORKER_TOPIC from environment', () => {
      process.env.WORKER_TOPIC = 'threat.detected.*';
      const config = require('../../config');

      expect(config.TOPIC).toBe('threat.detected.*');
    });
  });

  
  
  

  describe('edge cases', () => {
    it('should warn when RABBITMQ_URL is not set', () => {
      delete process.env.RABBITMQ_URL;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      require('../../config');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('RABBITMQ_URL not set'),
      );
      consoleSpy.mockRestore();
    });

    it('should not warn when RABBITMQ_URL is set', () => {
      process.env.RABBITMQ_URL = 'amqp://rabbit:5672';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      require('../../config');

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle WS_PORT as NaN when invalid string given', () => {
      process.env.WORKER_WS_PORT = 'not-a-number';
      const config = require('../../config');

      expect(config.WS_PORT).toBeNaN();
    });
  });
});
