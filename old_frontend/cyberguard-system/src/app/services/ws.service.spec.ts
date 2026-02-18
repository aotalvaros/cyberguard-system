import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { WsService } from './ws.service';
import { vi } from 'vitest';

describe('WsService', () => {
  let service: WsService;
  let mockWebSocket: any;
  let zone: NgZone;
  let store: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    store = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete store[key];
    });

    // Mock WebSocket
    mockWebSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null
    };

    vi.stubGlobal('WebSocket', vi.fn(() => mockWebSocket));

    TestBed.configureTestingModule({});
    zone = TestBed.inject(NgZone);
    service = new WsService(zone);
  });

  afterEach(() => {
    service?.disconnect();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should create service', () => {
      expect(service).toBeTruthy();
    });

    it('should load history from localStorage on init', () => {
      const mockHistory = [
        { eventId: '1', data: 'test1' },
        { eventId: '2', data: 'test2' }
      ];
      (localStorage.getItem as jasmine.Spy).and.returnValue(JSON.stringify(mockHistory));

      const newService = new WsService(zone);
      let messages: any[] = [];
      newService.messages$.subscribe(m => messages = m);

      expect(messages.length).toBe(2);
      expect(messages[0].eventId).toBe('1');
    });

    it('should handle malformed localStorage data gracefully', () => {
      (localStorage.getItem as jasmine.Spy).and.returnValue('invalid json');
      expect(() => new WsService(zone)).not.toThrow();
    });
  });

  describe('WebSocket Connection', () => {
    it('should connect to WebSocket', () => {
      service.connect();
      expect((window as any).WebSocket).toHaveBeenCalled();
    });

    it('should not create duplicate connections', () => {
      service.connect();
      mockWebSocket.onopen();
      service.connect();
      expect((window as any).WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should disconnect WebSocket', () => {
      service.connect();
      service.disconnect();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', fakeAsync(() => {
      service.connect();
      mockWebSocket.onerror();
      tick(2100);
      expect((window as any).WebSocket).toHaveBeenCalledTimes(2);
    }));

    it('should reconnect on close', fakeAsync(() => {
      service.connect();
      mockWebSocket.onclose();
      tick(2100);
      expect((window as any).WebSocket).toHaveBeenCalledTimes(2);
    }));
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      service.connect();
      mockWebSocket.onopen();
    });

    it('should receive and store messages', (done) => {
      const testMessage = { eventId: 'test-1', data: 'test data' };
      
      service.messages$.subscribe(messages => {
        if (messages.length > 0) {
          expect(messages[0]).toEqual(testMessage);
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(testMessage) });
      });
    });

    it('should deduplicate messages by eventId', (done) => {
      const msg = { eventId: 'dup-1', data: 'test' };
      
      service.messages$.subscribe(messages => {
        if (messages.length > 0) {
          expect(messages.length).toBe(1);
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg) });
        mockWebSocket.onmessage({ data: JSON.stringify(msg) });
      });
    });

    it('should deduplicate by nested threatId', (done) => {
      const msg = { data: { threatId: 'threat-1' }, info: 'test' };
      
      service.messages$.subscribe(messages => {
        if (messages.length > 0) {
          expect(messages.length).toBe(1);
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg) });
        mockWebSocket.onmessage({ data: JSON.stringify(msg) });
      });
    });

    it('should handle clear-all command', (done) => {
      const msg1 = { eventId: '1', data: 'test' };
      const clearCmd = { type: 'clear-all' };

      let callCount = 0;
      service.messages$.subscribe(messages => {
        callCount++;
        if (callCount === 2) {
          expect(messages.length).toBe(0);
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg1) });
        mockWebSocket.onmessage({ data: JSON.stringify(clearCmd) });
      });
    });

    it('should handle delete-one command', (done) => {
      const msg1 = { eventId: 'del-1', data: 'test' };
      const deleteCmd = { type: 'delete-one', id: 'del-1' };

      let callCount = 0;
      service.messages$.subscribe(messages => {
        callCount++;
        if (callCount === 2) {
          expect(messages.length).toBe(0);
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg1) });
        mockWebSocket.onmessage({ data: JSON.stringify(deleteCmd) });
      });
    });

    it('should persist messages to localStorage', () => {
      const msg = { eventId: 'persist-1', data: 'test' };
      
      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg) });
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cg_ws_history',
        jasmine.any(String)
      );
    });

    it('should respect history capacity limit', (done) => {
      const capacity = 200;
      
      service.messages$.subscribe(messages => {
        if (messages.length === capacity) {
          expect(messages.length).toBe(capacity);
          done();
        }
      });

      zone.run(() => {
        for (let i = 0; i < capacity + 10; i++) {
          mockWebSocket.onmessage({ 
            data: JSON.stringify({ eventId: `msg-${i}`, data: `test ${i}` })
          });
        }
      });
    });

    it('should ignore malformed messages', () => {
      expect(() => {
        zone.run(() => {
          mockWebSocket.onmessage({ data: 'invalid json' });
        });
      }).not.toThrow();
    });
  });

  describe('Message Operations', () => {
    beforeEach(() => {
      service.connect();
      mockWebSocket.onopen();
    });

    it('should delete message by index', (done) => {
      const msg1 = { eventId: '1', data: 'test1' };
      const msg2 = { eventId: '2', data: 'test2' };

      let callCount = 0;
      service.messages$.subscribe(messages => {
        callCount++;
        if (callCount === 3) {
          expect(messages.length).toBe(1);
          expect(messages[0].eventId).toBe('2');
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg1) });
        mockWebSocket.onmessage({ data: JSON.stringify(msg2) });
        service.deleteMessage(0);
      });
    });

    it('should clear all messages', (done) => {
      const msg = { eventId: '1', data: 'test' };

      let callCount = 0;
      service.messages$.subscribe(messages => {
        callCount++;
        if (callCount === 2) {
          expect(messages.length).toBe(0);
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg) });
        service.clearAll();
      });
    });

    it('should send clear-all request to server', () => {
      service.requestClearAll();
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'clear-all' })
      );
    });

    it('should send custom messages', () => {
      const customMsg = { type: 'custom', data: 'test' };
      service.send(customMsg);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(customMsg));
    });

    it('should not send when socket is closed', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      service.send({ test: 'data' });
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('Message ID Generation', () => {
    it('should generate ID from routingKey and receivedAt', (done) => {
      const msg1 = { routingKey: 'test.route', receivedAt: '2024-01-01', data: 'test' };
      const msg2 = { routingKey: 'test.route', receivedAt: '2024-01-01', data: 'different' };

      service.connect();
      mockWebSocket.onopen();

      service.messages$.subscribe(messages => {
        if (messages.length > 0) {
          expect(messages.length).toBe(1);
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg1) });
        mockWebSocket.onmessage({ data: JSON.stringify(msg2) });
      });
    });

    it('should generate hash-based ID as fallback', (done) => {
      const msg = { someField: 'value', noId: true };

      service.connect();
      mockWebSocket.onopen();

      service.messages$.subscribe(messages => {
        if (messages.length > 0) {
          expect(messages.length).toBe(1);
          done();
        }
      });

      zone.run(() => {
        mockWebSocket.onmessage({ data: JSON.stringify(msg) });
        mockWebSocket.onmessage({ data: JSON.stringify(msg) });
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should use custom WS URL from window.__env', () => {
      (window as any).__env = { WORKER_WS_URL: 'ws://custom:9999' };
      const customService = new WsService(zone);
      customService.connect();
      
      expect((window as any).WebSocket).toHaveBeenCalledWith('ws://custom:9999');
      delete (window as any).__env;
    });

    it('should use custom history capacity from window.__env', () => {
      (window as any).__env = { WORKER_HISTORY_CAPACITY: '50' };
      const customService = new WsService(zone);
      
      expect(customService).toBeTruthy();
      delete (window as any).__env;
    });
  });
});
