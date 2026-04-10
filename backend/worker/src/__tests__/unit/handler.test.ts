import { buildPayload, handleMessage } from '../../domain/services/MessageHandler';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('../../infrastructure/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../infrastructure/logging';

describe('Handler', () => {
  
  
  

  describe('buildPayload', () => {
    it('should create a payload with routingKey, data and receivedAt', () => {
      const data = { threatId: '123', type: 'malware' };
      const routingKey = 'threat.detected.malware';

      const payload = buildPayload(data, routingKey);

      expect(payload).toHaveProperty('routingKey', 'threat.detected.malware');
      expect(payload).toHaveProperty('data', data);
      expect(payload).toHaveProperty('receivedAt');
      expect(typeof payload.receivedAt).toBe('string');
    });

    it('should generate ISO 8601 formatted receivedAt', () => {
      const payload = buildPayload({}, 'test.key');

      expect(() => new Date(payload.receivedAt)).not.toThrow();
      expect(new Date(payload.receivedAt).toISOString()).toBe(payload.receivedAt);
    });

    it('should sanitize routingKey removing dangerous characters', () => {
      const payload = buildPayload({}, 'threat.<script>"alert"&');

      expect(payload.routingKey).not.toContain('<');
      expect(payload.routingKey).not.toContain('>');
      expect(payload.routingKey).not.toContain('"');
      expect(payload.routingKey).not.toContain("'");
      expect(payload.routingKey).not.toContain('&');
      expect(payload.routingKey).toBe('threat.scriptalert');
    });

    it('should not modify safe routingKey', () => {
      const payload = buildPayload({}, 'threat.detected.malware');

      expect(payload.routingKey).toBe('threat.detected.malware');
    });

    it('should accept null as data', () => {
      const payload = buildPayload(null, 'key');

      expect(payload.data).toBeNull();
    });

    it('should accept undefined as data', () => {
      const payload = buildPayload(undefined, 'key');

      expect(payload.data).toBeUndefined();
    });

    it('should accept string as data', () => {
      const payload = buildPayload('simple string', 'key');

      expect(payload.data).toBe('simple string');
    });

    it('should accept nested objects as data', () => {
      const nestedData = { a: { b: { c: 'deep' } } };
      const payload = buildPayload(nestedData, 'key');

      expect(payload.data).toEqual(nestedData);
    });

    it('should produce a readonly payload', () => {
      const payload = buildPayload({}, 'key');

      
      expect(Object.keys(payload)).toEqual(
        expect.arrayContaining(['routingKey', 'data', 'receivedAt']),
      );
    });
  });

  
  
  

  describe('handleMessage', () => {
    it('should return a valid payload for object data', async () => {
      const data = { threatId: 'abc', severity: 'high' };
      const result = await handleMessage(data, 'threat.detected');

      expect(result.routingKey).toBe('threat.detected');
      expect(result.data).toEqual(data);
      expect(typeof result.receivedAt).toBe('string');
    });

    it('should return a valid payload for string data', async () => {
      const result = await handleMessage('plain text', 'log.info');

      expect(result.routingKey).toBe('log.info');
      expect(result.data).toBe('plain text');
    });

    it('should sanitize string data with dangerous characters', async () => {
      const dangerousString = '<script>alert("xss")</script>';

      await handleMessage(dangerousString, 'test');

      expect(logger.warn).toHaveBeenCalledWith('Input contained dangerous characters');
    });

    it('should not warn for clean string data', async () => {

      await handleMessage('safe string', 'test');

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should handle numeric data', async () => {
      const result = await handleMessage(42, 'metric.value');

      expect(result.data).toBe(42);
    });

    it('should handle boolean data', async () => {
      const result = await handleMessage(true, 'flag.update');

      expect(result.data).toBe(true);
    });

    it('should handle null data', async () => {
      const result = await handleMessage(null, 'event.null');

      expect(result.data).toBeNull();
    });

    it('should handle array data', async () => {
      const arrayData = [1, 2, 3];
      const result = await handleMessage(arrayData, 'batch');

      expect(result.data).toEqual(arrayData);
    });

    it('should sanitize routingKey in the result', async () => {
      const result = await handleMessage({}, '<malicious>');

      expect(result.routingKey).toBe('malicious');
    });

    it('should include receivedAt as ISO string', async () => {
      const before = new Date();
      const result = await handleMessage({}, 'test');
      const after = new Date();

      const receivedAt = new Date(result.receivedAt);
      expect(receivedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(receivedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should handle empty object data', async () => {
      const result = await handleMessage({}, 'empty');

      expect(result.data).toEqual({});
    });

    it('should handle large payload data', async () => {
      const largeData = { items: Array.from({ length: 1000 }, (_, i) => ({ id: i })) };
      const result = await handleMessage(largeData, 'bulk');

      expect(result.data).toEqual(largeData);
    });
  });
});
