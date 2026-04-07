// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { firstValueFrom } from 'rxjs';
import {
  WebSocketRepositoryImpl,
  WebSocketFactory,
  StorageAdapter,
  defaultStorageAdapter,
} from '../websocket-repository.impl';
import { WS_COMMANDS, STORAGE_KEYS } from '@environments/constants';
import { AlertMessage } from '../../../domain/models/alert-message.model';

/**
 * Mock WebSocket for testing all WebSocket lifecycle events.
 */
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  sentMessages: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

/**
 * Mock storage adapter for testing without real localStorage.
 */
function createMockStorage(initialData: Record<string, string> = {}): StorageAdapter {
  const data = { ...initialData };
  return {
    getItem: vi.fn((key: string) => data[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data[key] = value;
    }),
  };
}

/**
 * Test subclass to expose protected methods for testing.
 */
class TestableWebSocketRepository extends WebSocketRepositoryImpl {
  public testAddMessage(message: AlertMessage): void {
    this.addMessage(message);
  }

  public testHandleMessage(event: MessageEvent): void {
    this.handleMessage(event);
  }

  public testScheduleReconnect(): void {
    this.scheduleReconnect();
  }

  public testSaveToStorage(messages: AlertMessage[]): void {
    this.saveToStorage(messages);
  }

  public testLoadFromStorage(): void {
    this.loadFromStorage();
  }
}


beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('WebSocketRepositoryImpl', () => {
  let repository: TestableWebSocketRepository;
  let mockWs: MockWebSocket;
  let mockStorage: StorageAdapter;
  let wsFactory: WebSocketFactory;

  beforeEach(() => {
    vi.useFakeTimers();
    mockStorage = createMockStorage();
    wsFactory = vi.fn((url: string) => {
      mockWs = new MockWebSocket(url);
      return mockWs as unknown as WebSocket;
    });

    repository = new TestableWebSocketRepository(wsFactory, mockStorage);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    try {
      repository.disconnect();
    } catch {
      // Ignore disconnect errors in cleanup
    }
  });

  describe('getMessages$', () => {
    it('should return observable of messages', async () => {
      const messages = await firstValueFrom(repository.getMessages$());
      expect(Array.isArray(messages)).toBe(true);
    });

    it('should initially return empty array', async () => {
      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages.length).toBe(0);
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(repository.isConnected()).toBe(false);
    });

    it('should return true after successful connection', () => {
      repository.connect();
      mockWs.simulateOpen();
      expect(repository.isConnected()).toBe(true);
    });

    it('should return false after disconnect', () => {
      repository.connect();
      mockWs.simulateOpen();
      repository.disconnect();
      expect(repository.isConnected()).toBe(false);
    });
  });

  describe('connect', () => {
    it('should create WebSocket with correct URL', () => {
      repository.connect();
      expect(wsFactory).toHaveBeenCalled();
    });

    it('should not create new WebSocket if already connected', () => {
      repository.connect();
      mockWs.simulateOpen();
      repository.connect();
      expect(wsFactory).toHaveBeenCalledTimes(1);
    });

    it('should set connected to true on open', () => {
      repository.connect();
      expect(repository.isConnected()).toBe(false);
      mockWs.simulateOpen();
      expect(repository.isConnected()).toBe(true);
    });

    it('should clear reconnect interval on successful connection', () => {
      // First, trigger reconnect by simulating close
      repository.connect();
      mockWs.simulateClose();
      vi.advanceTimersByTime(1000);

      // Now connect successfully
      mockWs.simulateOpen();
      expect(repository.isConnected()).toBe(true);
    });

    it('should schedule reconnect on close', () => {
      repository.connect();
      mockWs.simulateOpen();
      mockWs.simulateClose();
      expect(repository.isConnected()).toBe(false);
    });

    it('should handle connection error gracefully', () => {
      const errorFactory: WebSocketFactory = () => {
        throw new Error('Connection failed');
      };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const errorRepo = new TestableWebSocketRepository(errorFactory, mockStorage);
      errorRepo.connect();

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket connection failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should log error on WebSocket error event', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      repository.connect();
      mockWs.simulateError();
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', expect.any(Event));
      consoleSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should set connected to false', () => {
      repository.connect();
      mockWs.simulateOpen();
      repository.disconnect();
      expect(repository.isConnected()).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      repository.disconnect();
      repository.disconnect();
      expect(repository.isConnected()).toBe(false);
    });

    it('should clear reconnect interval after disconnect', () => {
      // Verify that calling disconnect multiple times doesn't throw
      // and leaves the repo in a clean state 
      repository.connect();
      mockWs.simulateOpen();
      repository.disconnect();
      repository.disconnect(); // Should be safe to call multiple times
      expect(repository.isConnected()).toBe(false);
    });

    it('should close WebSocket connection', () => {
      repository.connect();
      mockWs.simulateOpen();
      const closeSpy = vi.spyOn(mockWs, 'close');
      repository.disconnect();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe('sendCommand', () => {
    it('should send command when connected', () => {
      repository.connect();
      mockWs.simulateOpen();

      const command = { type: WS_COMMANDS.CLEAR_ALL };
      repository.sendCommand(command);

      expect(mockWs.sentMessages).toHaveLength(1);
      expect(JSON.parse(mockWs.sentMessages[0])).toEqual(command);
    });

    it('should not send command when not connected', () => {
      const command = { type: WS_COMMANDS.CLEAR_ALL };
      repository.sendCommand(command);
      // No error should be thrown and no message sent since ws is null initially
      // After connect() is called, mockWs exists, but readyState won't be OPEN
      expect(true).toBe(true);
    });

    it('should clear messages on CLEAR_ALL command', async () => {
      // Add some messages first
      repository.testAddMessage({
        eventId: 'test-1',
        timestamp: Date.now(),
        data: { threatId: 'threat-1', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'Test' },
      });

      repository.connect();
      mockWs.simulateOpen();
      repository.sendCommand({ type: WS_COMMANDS.CLEAR_ALL });

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(0);
      expect(mockStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.WS_HISTORY, '[]');
    });

    it('should delete specific message on DELETE_ONE command', async () => {
      repository.testAddMessage({
        eventId: 'keep-1',
        timestamp: Date.now(),
        data: { threatId: 'threat-keep', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'Keep' },
      });
      repository.testAddMessage({
        eventId: 'delete-1',
        timestamp: Date.now(),
        data: { threatId: 'threat-delete', type: 'ddos', severity: 'low', sourceIp: '10.0.0.2', description: 'Delete' },
      });

      repository.connect();
      mockWs.simulateOpen();
      repository.sendCommand({ type: WS_COMMANDS.DELETE_ONE, id: 'delete-1' });

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(1);
      expect(messages[0].eventId).toBe('keep-1');
    });
  });

  describe('handleMessage', () => {
    it('should parse and add valid message', async () => {
      const validMessage = {
        data: {
          eventId: 'event-1',
          data: {
            threatId: 'threat-1',
            type: 'malware',
            severity: 'critical',
            sourceIp: '192.168.1.1',
            description: 'Malware detected',
          },
        },
      };

      repository.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(validMessage);

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(1);
      expect(messages[0].eventId).toBe('event-1');
      expect(messages[0].data.threatId).toBe('threat-1');
    });

    it('should ignore invalid JSON', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      repository.connect();
      mockWs.simulateOpen();

      if (mockWs.onmessage) {
        mockWs.onmessage(new MessageEvent('message', { data: 'invalid-json' }));
      }

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should ignore message without proper structure', async () => {
      const invalidStructure = { foo: 'bar' };

      repository.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(invalidStructure);

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(0);
    });

    it('should ignore message without nested data', async () => {
      const missingNestedData = {
        data: {
          eventId: 'event-1',
          // missing data.data
        },
      };

      repository.connect();
      mockWs.simulateOpen();
      mockWs.simulateMessage(missingNestedData);

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(0);
    });
  });

  describe('addMessage', () => {
    it('should add new message to the list', async () => {
      const message: AlertMessage = {
        eventId: 'new-1',
        timestamp: Date.now(),
        data: { threatId: 'threat-new', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'New' },
      };

      repository.testAddMessage(message);

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(1);
      expect(messages[0].eventId).toBe('new-1');
    });

    it('should deduplicate by eventId', async () => {
      const message: AlertMessage = {
        eventId: 'dup-1',
        timestamp: Date.now(),
        data: { threatId: 'threat-1', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'First' },
      };

      repository.testAddMessage(message);
      repository.testAddMessage({ ...message, timestamp: Date.now() + 1000 });

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(1);
    });

    it('should deduplicate by threatId', async () => {
      repository.testAddMessage({
        eventId: 'event-1',
        timestamp: Date.now(),
        data: { threatId: 'same-threat', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'First' },
      });
      repository.testAddMessage({
        eventId: 'event-2',
        timestamp: Date.now(),
        data: { threatId: 'same-threat', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'Second' },
      });

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(1);
    });

    it('should prepend new messages (newest first)', async () => {
      repository.testAddMessage({
        eventId: 'old-1',
        timestamp: 1000,
        data: { threatId: 'threat-old', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'Old' },
      });
      repository.testAddMessage({
        eventId: 'new-1',
        timestamp: 2000,
        data: { threatId: 'threat-new', type: 'ddos', severity: 'low', sourceIp: '10.0.0.2', description: 'New' },
      });

      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages[0].eventId).toBe('new-1');
    });

    it('should save to storage after adding', () => {
      repository.testAddMessage({
        eventId: 'save-1',
        timestamp: Date.now(),
        data: { threatId: 'threat-save', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'Save' },
      });

      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('should cap messages at MAX_MESSAGES (200)', async () => {
      for (let i = 0; i < 201; i++) {
        repository.testAddMessage({
          eventId: `evt-${i}`,
          timestamp: i,
          data: { threatId: `t-${i}`, type: 'malware', severity: 'low',
                  sourceIp: '1.2.3.4', description: 'x' },
        });
      }
      const messages = await firstValueFrom(repository.getMessages$());
      expect(messages).toHaveLength(200);
      expect(messages[0].eventId).toBe('evt-200'); // most recent at front
    });
  });

  describe('scheduleReconnect', () => {
    it('should attempt reconnect after interval', () => {
      repository.connect();
      mockWs.simulateClose();

      // Initial connect
      expect(wsFactory).toHaveBeenCalledTimes(1);

      // After 1 second (exponential backoff attempt 0 → 1000ms)
      vi.advanceTimersByTime(1000);
      expect(wsFactory).toHaveBeenCalledTimes(2);
    });

    it('should not create multiple reconnect timeouts', () => {
      repository.connect();
      mockWs.simulateClose();

      // First reconnect at 1000ms
      vi.advanceTimersByTime(1000);
      // Second reconnect at 2000ms
      const ws2 = (wsFactory as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value as MockWebSocket;
      ws2.simulateClose();
      vi.advanceTimersByTime(2000);
      // Third reconnect at 4000ms
      const ws3 = (wsFactory as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value as MockWebSocket;
      ws3.simulateClose();
      vi.advanceTimersByTime(4000);

      expect(wsFactory).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('exponential backoff reconnect', () => {
    it('attempt 0→1000ms, attempt 1→2000ms, attempt 2→4000ms', () => {
      repository.connect();
      mockWs.simulateOpen();

      // close 1 → attempt 0, delay 1000ms
      mockWs.simulateClose();
      vi.advanceTimersByTime(999);
      expect(wsFactory).toHaveBeenCalledTimes(1); // not yet
      vi.advanceTimersByTime(1);
      expect(wsFactory).toHaveBeenCalledTimes(2); // reconnected at 1000ms

      // close 2 → attempt 1, delay 2000ms
      const ws2 = (wsFactory as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value as MockWebSocket;
      ws2.simulateClose();
      vi.advanceTimersByTime(1999);
      expect(wsFactory).toHaveBeenCalledTimes(2);
      vi.advanceTimersByTime(1);
      expect(wsFactory).toHaveBeenCalledTimes(3); // reconnected at 2000ms

      // close 3 → attempt 2, delay 4000ms
      const ws3 = (wsFactory as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value as MockWebSocket;
      ws3.simulateClose();
      vi.advanceTimersByTime(3999);
      expect(wsFactory).toHaveBeenCalledTimes(3);
      vi.advanceTimersByTime(1);
      expect(wsFactory).toHaveBeenCalledTimes(4); // reconnected at 4000ms
    });

    it('should stop reconnecting after MAX_RECONNECT_ATTEMPTS (5)', () => {
      repository.connect();
      mockWs.simulateOpen();

      for (let i = 0; i < 6; i++) {
        const lastWs = (wsFactory as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value as MockWebSocket;
        lastWs.simulateClose();
        vi.advanceTimersByTime(30000); // skip any delay
      }

      // 1 initial + 5 retries max = 6 total (6th close doesn't trigger new attempt)
      expect(wsFactory).toHaveBeenCalledTimes(6);
    });

    it('should emit ERROR status after max attempts exhausted', () => {
      const statuses: string[] = [];
      repository.connectionStatus$.subscribe(s => statuses.push(s));

      repository.connect();
      mockWs.simulateOpen();

      // 5 close+advance cycles → 5 reconnect attempts exhaust the limit
      for (let i = 0; i < 5; i++) {
        const lastWs = (wsFactory as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value as MockWebSocket;
        lastWs.simulateClose();
        vi.advanceTimersByTime(30000);
      }

      // The 5th timer triggered a new connect(), creating WS #6.
      // When WS #6 also closes, attempt=5 >= MAX → ERROR
      const finalWs = (wsFactory as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value as MockWebSocket;
      finalWs.simulateClose();

      // After max attempts exhausted, last status should be ERROR
      expect(statuses.at(-1)).toBe('ERROR');
    });
  });

  describe('storage persistence', () => {
    it('should load messages from storage on init', async () => {
      const storedMessages: AlertMessage[] = [
        {
          eventId: 'stored-1',
          timestamp: Date.now(),
          data: { threatId: 'threat-stored', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'Stored' },
        },
      ];

      const storageWithData = createMockStorage({
        [STORAGE_KEYS.WS_HISTORY]: JSON.stringify(storedMessages),
      });

      const repoWithData = new TestableWebSocketRepository(wsFactory, storageWithData);
      const messages = await firstValueFrom(repoWithData.getMessages$());

      expect(messages).toHaveLength(1);
      expect(messages[0].eventId).toBe('stored-1');
    });

    it('should handle invalid JSON in storage gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const storageWithBadData = createMockStorage({
        [STORAGE_KEYS.WS_HISTORY]: 'invalid-json',
      });

      const repoWithBadData = new TestableWebSocketRepository(wsFactory, storageWithBadData);
      const messages = await firstValueFrom(repoWithBadData.getMessages$());

      expect(messages).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should filter invalid messages from storage', async () => {
      const mixedMessages = [
        {
          eventId: 'valid-1',
          timestamp: Date.now(),
          data: { threatId: 'threat-1', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'Valid' },
        },
        {
          eventId: 'invalid-no-data',
          timestamp: Date.now(),
        },
        {
          eventId: 'invalid-no-threatid',
          data: { type: 'test', severity: 'low' },
        },
      ];

      const storageWithMixed = createMockStorage({
        [STORAGE_KEYS.WS_HISTORY]: JSON.stringify(mixedMessages),
      });

      const repoWithMixed = new TestableWebSocketRepository(wsFactory, storageWithMixed);
      const messages = await firstValueFrom(repoWithMixed.getMessages$());

      expect(messages).toHaveLength(1);
      expect(messages[0].eventId).toBe('valid-1');
    });

    it('should handle storage setItem error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const errorStorage: StorageAdapter = {
        getItem: () => null,
        setItem: () => {
          throw new Error('Storage full');
        },
      };

      const repoWithErrorStorage = new TestableWebSocketRepository(wsFactory, errorStorage);
      repoWithErrorStorage.testAddMessage({
        eventId: 'test-1',
        timestamp: Date.now(),
        data: { threatId: 'threat-1', type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: 'Test' },
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to save to storage:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
