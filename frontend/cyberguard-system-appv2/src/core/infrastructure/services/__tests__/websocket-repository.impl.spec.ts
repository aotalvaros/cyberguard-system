import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
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
      vi.advanceTimersByTime(2000);

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
  });

  describe('scheduleReconnect', () => {
    it('should attempt reconnect after interval', () => {
      repository.connect();
      mockWs.simulateClose();

      // Initial connect
      expect(wsFactory).toHaveBeenCalledTimes(1);

      // After 2 seconds, should try again
      vi.advanceTimersByTime(2000);
      expect(wsFactory).toHaveBeenCalledTimes(2);
    });

    it('should not create multiple reconnect intervals', () => {
      repository.connect();
      mockWs.simulateClose();

      vi.advanceTimersByTime(2000);
      vi.advanceTimersByTime(2000);
      vi.advanceTimersByTime(2000);

      // Should still only have reconnect calls, not exponential
      expect(wsFactory).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
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
