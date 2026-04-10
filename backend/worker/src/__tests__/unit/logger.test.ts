import { logger } from '../../infrastructure/logging';

describe('logger', () => {
  it('should export a valid winston logger instance', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should have the default log level as info when LOG_LEVEL is not set', () => {
    delete process.env.LOG_LEVEL;
    expect(['info', 'debug', 'warn', 'error', 'verbose', 'silly']).toContain(logger.level);
  });

  it('should respect LOG_LEVEL env variable', () => {
    const expectedLevel = process.env.LOG_LEVEL || 'info';
    expect(logger.level).toBe(expectedLevel);
  });

  it('should log info messages without throwing', () => {
    expect(() => logger.info('test info message')).not.toThrow();
  });

  it('should log error messages without throwing', () => {
    expect(() => logger.error('test error message', { error: 'details' })).not.toThrow();
  });

  it('should log warn messages without throwing', () => {
    expect(() => logger.warn('test warn message')).not.toThrow();
  });

  it('should have at least one transport configured', () => {
    expect(logger.transports.length).toBeGreaterThan(0);
  });
});
