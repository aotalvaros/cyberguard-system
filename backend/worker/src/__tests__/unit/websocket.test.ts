import WebSocket from 'ws';
import { describe, it, expect, jest, afterEach, beforeEach } from '@jest/globals';
import { WebSocketBroadcaster } from '../../infrastructure/websocket/WebSocketBroadcaster';
import type { IEventRepository, StoredNotifPreferences } from '../../domain/ports/IEventRepository';

jest.mock('../../infrastructure/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('WebSocketBroadcaster', () => {
  const TEST_PORT = 9876;
  let broadcaster: WebSocketBroadcaster;
  let repository: IEventRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = {
      connect: jest.fn<(url?: string) => Promise<void>>().mockResolvedValue(undefined),
      close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      save: jest.fn<(payload: unknown) => Promise<void>>().mockResolvedValue(undefined),
      getHistory: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      clearHistory: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      removeById: jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
      removeByThreatId: jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
      getAllNotifPreferences: jest.fn<() => Promise<StoredNotifPreferences[]>>().mockResolvedValue([]),
    };

    broadcaster = new WebSocketBroadcaster(repository);
  });

  afterEach(async () => {
    await broadcaster.close();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('should accept client connections', (done) => {
    const server = broadcaster.start(TEST_PORT);

    server.on('listening', () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      client.on('open', () => {
        expect(server.clients.size).toBe(1);
        client.close();
        done();
      });
    });
  });

  it('should broadcast payload to connected clients', (done) => {
    const server = broadcaster.start(TEST_PORT);
    const payload = { type: 'threat', data: { id: '123' } };

    server.on('listening', () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      client.on('open', () => {
        setTimeout(() => broadcaster.broadcast(payload), 50);
      });
      client.on('message', (raw) => {
        const data = JSON.parse(raw.toString());
        if (data.type === 'threat') {
          expect(data).toEqual(payload);
          client.close();
          done();
        }
      });
    });
  });

  it('should handle clear-all message', (done) => {
    const server = broadcaster.start(TEST_PORT);

    server.on('listening', () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      client.on('open', () => {
        client.send(JSON.stringify({ type: 'clear-all' }));
      });
      client.once('message', (raw) => {
        const data = JSON.parse(raw.toString());
        expect(data.type).toBe('clear-all');
        expect(repository.clearHistory).toHaveBeenCalled();
        client.close();
        done();
      });
    });
  });

  it('should handle delete-one message', (done) => {
    const server = broadcaster.start(TEST_PORT);

    server.on('listening', () => {
      const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
      client.on('open', () => {
        client.send(JSON.stringify({ type: 'delete-one', id: 'test-id' }));
      });
      client.once('message', (raw) => {
        const data = JSON.parse(raw.toString());
        expect(data.type).toBe('delete-one');
        expect(repository.removeById).toHaveBeenCalledWith('test-id');
        expect(repository.removeByThreatId).toHaveBeenCalledWith('test-id');
        client.close();
        done();
      });
    });
  });

  it('should close server without error', async () => {
    broadcaster.start(TEST_PORT);
    await expect(broadcaster.close()).resolves.toBeUndefined();
  });
});