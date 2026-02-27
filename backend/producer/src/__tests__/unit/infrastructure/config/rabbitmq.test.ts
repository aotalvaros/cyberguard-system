/**
 * Unit Tests: rabbitmq.ts — RabbitMQConnection
 *
 * VERIFICAR: Singleton Pattern — una sola instancia en toda la app.
 * VERIFICAR: connect() establece conexión y configura exchanges/colas.
 * VERIFICAR: getChannel() retorna el canal activo.
 * VERIFICAR: publishEvent() publica y espera confirmación del broker.
 * VERIFICAR: close() cierra canal y conexión ordenadamente.
 * VALIDAR:   connect() falla y propaga si amqp.connect lanza error.
 * VALIDAR:   getChannel() lanza si no hay canal (no se llamó connect()).
 * VALIDAR:   publishEvent() rechaza en NACK del broker.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ── Mocks ────────────────────────────────────────────────────────────────────
type AsyncFn  = (...args: unknown[]) => Promise<unknown>;
type VoidFn   = (...args: unknown[]) => void;
type BoolFn   = (...args: unknown[]) => boolean;

const mockAssertExchange        = jest.fn<AsyncFn>().mockResolvedValue(undefined);
const mockAssertQueue           = jest.fn<AsyncFn>().mockResolvedValue(undefined);
const mockBindQueue             = jest.fn<AsyncFn>().mockResolvedValue(undefined);
const mockPublish               = jest.fn<BoolFn>().mockReturnValue(true);
const mockWaitForConfirms       = jest.fn<AsyncFn>().mockResolvedValue(undefined);
const mockChannelClose          = jest.fn<AsyncFn>().mockResolvedValue(undefined);
const mockChannelOnce           = jest.fn<VoidFn>();

const mockChannel = {
  assertExchange:   mockAssertExchange,
  assertQueue:      mockAssertQueue,
  bindQueue:        mockBindQueue,
  publish:          mockPublish,
  waitForConfirms:  mockWaitForConfirms,
  close:            mockChannelClose,
  once:             mockChannelOnce,
};

const mockConnectionOn    = jest.fn<VoidFn>();
const mockConnectionClose = jest.fn<AsyncFn>().mockResolvedValue(undefined);
const mockCreateChannel   = jest.fn<AsyncFn>().mockResolvedValue(mockChannel);

const mockConnection = {
  createConfirmChannel: mockCreateChannel,
  on:    mockConnectionOn,
  close: mockConnectionClose,
};

const mockAmqpConnect = jest.fn<AsyncFn>().mockResolvedValue(mockConnection);

jest.mock('amqplib', () => ({ connect: mockAmqpConnect }));
jest.mock('../../../../infrastructure/config/env', () => ({
  config: { rabbitmqUrl: 'amqp://test-host:5672' },
}));
jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { RabbitMQConnection } from '../../../../infrastructure/config/rabbitmq';
import { logger } from '../../../../infrastructure/config/logger';

// ─────────────────────────────────────────────────────────────────────────────

describe('RabbitMQConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RabbitMQConnection.resetInstance();
    // Restore default resolved values after clearAllMocks
    (mockAmqpConnect as jest.MockedFunction<AsyncFn>).mockResolvedValue(mockConnection);
    (mockCreateChannel as jest.MockedFunction<AsyncFn>).mockResolvedValue(mockChannel);
    mockPublish.mockReturnValue(true);
    (mockWaitForConfirms as jest.MockedFunction<AsyncFn>).mockResolvedValue(undefined);
    (mockChannelClose as jest.MockedFunction<AsyncFn>).mockResolvedValue(undefined);
    (mockConnectionClose as jest.MockedFunction<AsyncFn>).mockResolvedValue(undefined);
    (mockAssertExchange as jest.MockedFunction<AsyncFn>).mockResolvedValue(undefined);
    (mockAssertQueue as jest.MockedFunction<AsyncFn>).mockResolvedValue(undefined);
    (mockBindQueue as jest.MockedFunction<AsyncFn>).mockResolvedValue(undefined);
  });

  // ── Singleton ─────────────────────────────────────────────────────────────
  describe('getInstance()', () => {
    it('should return the same instance on multiple calls', () => {
      const i1 = RabbitMQConnection.getInstance();
      const i2 = RabbitMQConnection.getInstance();
      expect(i1).toBe(i2);
    });

    it('should return a new instance after resetInstance()', () => {
      const before = RabbitMQConnection.getInstance();
      RabbitMQConnection.resetInstance();
      const after = RabbitMQConnection.getInstance();
      expect(before).not.toBe(after);
    });
  });

  // ── connect ───────────────────────────────────────────────────────────────
  describe('connect()', () => {
    it('should call amqp.connect with the configured URL', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      expect(mockAmqpConnect).toHaveBeenCalledWith('amqp://test-host:5672');
    });

    it('should create a confirm channel', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      expect(mockCreateChannel).toHaveBeenCalledTimes(1);
    });

    it('should assert the main topic exchange', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      expect(mockAssertExchange).toHaveBeenCalledWith(
        'cyberguard.events',
        'topic',
        { durable: true },
      );
    });

    it('should assert the Dead Letter Exchange', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      expect(mockAssertExchange).toHaveBeenCalledWith(
        'cyberguard.dlx',
        'direct',
        { durable: true },
      );
    });

    it('should assert the failed.messages queue and bind it', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      expect(mockAssertQueue).toHaveBeenCalledWith('failed.messages', { durable: true });
      expect(mockBindQueue).toHaveBeenCalledWith('failed.messages', 'cyberguard.dlx', '');
    });

    it('should log success after connecting', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      expect(logger.info).toHaveBeenCalledWith(
        'RabbitMQ connected with Publisher Confirms enabled',
      );
    });

    it('should skip reconnecting when already connected', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      await conn.connect(); // second call should be a no-op
      expect(mockAmqpConnect).toHaveBeenCalledTimes(1);
    });

    it('should throw and log when amqp.connect fails', async () => {
      const connectError = new Error('ECONNREFUSED');
      mockAmqpConnect.mockRejectedValueOnce(connectError);

      const conn = RabbitMQConnection.getInstance();
      await expect(conn.connect()).rejects.toThrow('ECONNREFUSED');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'ECONNREFUSED' },
      );
    });

    it('should handle non-Error thrown values in connect catch block', async () => {
      mockAmqpConnect.mockRejectedValueOnce('string error');

      const conn = RabbitMQConnection.getInstance();
      await expect(conn.connect()).rejects.toBe('string error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to connect to RabbitMQ',
        { error: 'string error' },
      );
    });

    it('should register connection error and close event handlers', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      expect(mockConnectionOn).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnectionOn).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('connection "error" handler logs the error message', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      const errorCb = mockConnectionOn.mock.calls.find((c) => c[0] === 'error')?.[1] as
        | ((e: Error) => void)
        | undefined;
      expect(errorCb).toBeDefined();
      errorCb!(new Error('broker died'));
      expect(logger.error).toHaveBeenCalledWith('RabbitMQ connection error', {
        error: 'broker died',
      });
    });

    it('connection "close" handler logs and resets internal state', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      const closeCb = mockConnectionOn.mock.calls.find((c) => c[0] === 'close')?.[1] as
        | (() => void)
        | undefined;
      expect(closeCb).toBeDefined();
      closeCb!();
      expect(logger.warn).toHaveBeenCalledWith('RabbitMQ connection closed');
    });
  });

  // ── getChannel ────────────────────────────────────────────────────────────
  describe('getChannel()', () => {
    it('should return the active channel after connecting', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      const ch = conn.getChannel();
      expect(ch).toBe(mockChannel);
    });

    it('should throw when called before connect()', () => {
      const conn = RabbitMQConnection.getInstance();
      expect(() => conn.getChannel()).toThrow('RabbitMQ channel not initialized');
    });
  });

  // ── publishEvent ──────────────────────────────────────────────────────────
  describe('publishEvent()', () => {
    it('should publish the event as JSON with persistent options', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();

      // Simulate broker confirming the message (callback with no error)
      mockPublish.mockImplementationOnce((_ex, _key, _buf, _opts, cb) => {
        (cb as (err: null) => void)(null);
        return true;
      });

      await conn.publishEvent('threat.detected', { eventId: 'ev-1', type: 'malware' });

      expect(mockPublish).toHaveBeenCalledWith(
        'cyberguard.events',
        'threat.detected',
        expect.any(Buffer),
        expect.objectContaining({ persistent: true, contentType: 'application/json' }),
        expect.any(Function),
      );
    });

    it('should resolve when broker confirms the message', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();

      mockPublish.mockImplementationOnce((_ex, _key, _buf, _opts, cb) => {
        (cb as (err: null) => void)(null);
        return true;
      });

      await expect(
        conn.publishEvent('threat.detected', { eventId: 'ev-2' }),
      ).resolves.toBeUndefined();

      expect(logger.info).toHaveBeenCalledWith(
        'Event published and confirmed',
        expect.objectContaining({ routingKey: 'threat.detected' }),
      );
    });

    it('should reject when broker NACKs the message (Error object)', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();

      const nackError = new Error('NACK from broker');
      mockPublish.mockImplementationOnce((_ex, _key, _buf, _opts, cb) => {
        (cb as (err: Error) => void)(nackError);
        return true;
      });

      await expect(
        conn.publishEvent('threat.detected', { eventId: 'ev-3' }),
      ).rejects.toThrow('NACK from broker');

      expect(logger.error).toHaveBeenCalledWith(
        'Event NACK - not confirmed by RabbitMQ',
        expect.objectContaining({ error: 'NACK from broker' }),
      );
    });

    it('should reject with an Error when broker NACKs with a non-Error value', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();

      mockPublish.mockImplementationOnce((_ex, _key, _buf, _opts, cb) => {
        (cb as (err: string) => void)('channel closed');
        return true;
      });

      await expect(
        conn.publishEvent('threat.detected', { eventId: 'ev-4' }),
      ).rejects.toThrow('channel closed');
    });

    it('should warn and register drain handler when channel buffer is full', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();

      // publish returns false → buffer full
      mockPublish.mockImplementationOnce((_ex, _key, _buf, _opts, cb) => {
        (cb as (err: null) => void)(null);
        return false;
      });

      await conn.publishEvent('threat.detected', { eventId: 'ev-5' });

      expect(logger.warn).toHaveBeenCalledWith(
        'RabbitMQ channel buffer full, waiting for drain',
        expect.objectContaining({ routingKey: 'threat.detected' }),
      );
      expect(mockChannelOnce).toHaveBeenCalledWith('drain', expect.any(Function));
    });
  });

  // ── close ─────────────────────────────────────────────────────────────────
  describe('close()', () => {
    it('should wait for confirmations and close channel then connection', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      await conn.close();

      expect(mockWaitForConfirms).toHaveBeenCalledTimes(1);
      expect(mockChannelClose).toHaveBeenCalledTimes(1);
      expect(mockConnectionClose).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('RabbitMQ connection closed gracefully');
    });

    it('should close gracefully when called before connect (no channel)', async () => {
      const conn = RabbitMQConnection.getInstance();
      await expect(conn.close()).resolves.toBeUndefined();
      expect(mockWaitForConfirms).not.toHaveBeenCalled();
    });

    it('should log error when close throws', async () => {
      const conn = RabbitMQConnection.getInstance();
      await conn.connect();
      mockChannelClose.mockRejectedValueOnce(new Error('close failed'));

      await conn.close(); // should not throw

      expect(logger.error).toHaveBeenCalledWith(
        'Error closing RabbitMQ',
        { error: 'close failed' },
      );
    });
  });
});
