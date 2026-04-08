import WebSocket, { Server } from 'ws';
import { startWebSocket, broadcast, closeWebSocket } from '../../websocket';
import { describe, it, expect, jest, afterEach } from '@jest/globals';

jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../redis', () => ({
  getHistoryFromRedis: jest.fn().mockResolvedValue([] as never),
  clearHistoryFromRedis: jest.fn().mockResolvedValue(undefined as never),
  removeHistoryItemById: jest.fn().mockResolvedValue(undefined as never),
  removeHistoryItemByThreatId: jest.fn().mockResolvedValue(undefined as never),
}));

import { clearHistoryFromRedis, removeHistoryItemById } from '../../redis';
import { logger } from '../../logger';

describe('WebSocket Module', () => {
  let server: Server;
  const TEST_PORT = 9876;

  afterEach(async () => {
    await closeWebSocket();
    
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  
  
  

  describe('startWebSocket', () => {
    it('should accept client connections', (done) => {
      server = startWebSocket(TEST_PORT);

      server.on('listening', () => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        client.on('open', () => {
          expect(server.clients.size).toBe(1);
          client.close();
          done?.()
        });
      });
    });
    
    it('should log client connection', (done) => {
      server = startWebSocket(TEST_PORT);

      server.on('listening', () => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        client.on('open', () => {
          expect(logger.info).toHaveBeenCalledWith('WebSocket client connected');
          client.close();
          done?.()
        });
      });
    });

    it('should log client disconnection', (done) => {
      server = startWebSocket(TEST_PORT);

      server.on('listening', () => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        client.on('open', () => {
          client.close();
        });
        client.on('close', () => {
          
          setTimeout(() => {
            expect(logger.info).toHaveBeenCalledWith('WebSocket client disconnected');
            done?.()
          }, 50);
        });
      });
    });
  });

  
  
  

  describe('client messages', () => {
    it('should handle clear-all message', (done) => {
      server = startWebSocket(TEST_PORT);

      server.on('listening', () => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        client.on('open', () => {
          client.send(JSON.stringify({ type: 'clear-all' }));
        });
        client.on('message', (raw) => {
          const data = JSON.parse(raw.toString());
          if (data.type === 'clear-all') {
            expect(data).toHaveProperty('clearedAt');
            expect(clearHistoryFromRedis).toHaveBeenCalled();
            client.close();
            done?.()
          }
        });
      });
    });

    it('should handle delete-one message', (done) => {
      server = startWebSocket(TEST_PORT);

      server.on('listening', () => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        client.on('open', () => {
          client.send(JSON.stringify({ type: 'delete-one', id: 'test-id' }));
        });
        client.on('message', (raw) => {
          const data = JSON.parse(raw.toString());
          if (data.type === 'delete-one') {
            expect(data.id).toBe('test-id');
            expect(data).toHaveProperty('deletedAt');
            expect(removeHistoryItemById).toHaveBeenCalledWith('test-id');
            client.close();
            done?.()
          }
        });
      });
    });

    it('should ignore invalid message format', (done) => {
      server = startWebSocket(TEST_PORT);

      server.on('listening', () => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        client.on('open', () => {
          client.send(JSON.stringify({ type: 'unknown-action' }));
          setTimeout(() => {
            expect(logger.warn).toHaveBeenCalledWith(
              'Invalid WebSocket message format',
              expect.any(Object),
            );
            client.close();
            done?.()
          }, 100);
        });
      });
    });

    it('should handle malformed JSON message', (done) => {
      server = startWebSocket(TEST_PORT);

      server.on('listening', () => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        client.on('open', () => {
          client.send('not-valid-json{{{');
          setTimeout(() => {
            expect(logger.warn).toHaveBeenCalledWith(
              'WebSocket message ignored',
              expect.objectContaining({ error: expect.any(String) }),
            );
            client.close();
            done?.()
          }, 100);
        });
      });
    });
  });

  
  
  

  describe('broadcast', () => {
    it('should send payload to all connected clients', (done) => {
      server = startWebSocket(TEST_PORT);
      const payload = { type: 'threat', data: { id: '123' } };

      server.on('listening', () => {
        const client = new WebSocket(`ws://localhost:${TEST_PORT}`);
        client.on('open', () => {
          
          setTimeout(() => {
            broadcast(payload);
          }, 50);
        });
        client.on('message', (raw) => {
          const data = JSON.parse(raw.toString());
          if (data.type === 'threat') {
            expect(data).toEqual(payload);
            client.close();
            done?.();
          }
        });
      });
    });

    it('should not throw when no server is running', () => {
      
      expect(() => broadcast({ test: true })).not.toThrow();
    });

    it('should handle multiple connected clients', (done) => {
      server = startWebSocket(TEST_PORT);
      const payload = { message: 'broadcast-test' };
      let received = 0;

      server.on('listening', () => {
        const client1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
        const client2 = new WebSocket(`ws://localhost:${TEST_PORT}`);

        const handleMessage = (raw: WebSocket.RawData) => {
          const data = JSON.parse(raw.toString());
          if (data.message === 'broadcast-test') {
            received++;
            if (received === 2) {
              client1.close();
              client2.close();
              done?.();
            }
          }
        };

        client1.on('message', handleMessage);
        client2.on('message', handleMessage);

        
        let connected = 0;
        const onOpen = () => {
          connected++;
          if (connected === 2) {
            setTimeout(() => broadcast(payload), 50);
          }
        };
        client1.on('open', onOpen);
        client2.on('open', onOpen);
      });
    });
  });

  
  
  

  describe('closeWebSocket', () => {
    it('should close the server without error', async () => {
      startWebSocket(TEST_PORT);

      await expect(closeWebSocket()).resolves.toBeUndefined();
    });

    it('should resolve when no server exists', async () => {
      await expect(closeWebSocket()).resolves.toBeUndefined();
    });
  });
});
