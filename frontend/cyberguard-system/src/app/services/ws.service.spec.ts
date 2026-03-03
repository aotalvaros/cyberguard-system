// Tipo de prueba: Integración
import { TestBed } from '@angular/core/testing';
import { WsService } from './ws.service';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  
  readyState = MockWebSocket.CLOSED;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {}

  send(data: string) {
    // Mock send implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  // Helper methods for testing
  triggerOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  triggerMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  triggerError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  triggerClose() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

describe('WsService', () => {
  let service: WsService;
  let mockWebSocket: MockWebSocket;
  let originalWebSocket: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WsService]
    });
    
    // Save original WebSocket and replace with mock
    originalWebSocket = (global as any).WebSocket;
    (global as any).WebSocket = class extends MockWebSocket {
      constructor(url: string) {
        super(url);
        mockWebSocket = this;
      }
    };

    service = TestBed.inject(WsService);
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Restore original WebSocket
    (global as any).WebSocket = originalWebSocket;
    service.disconnect();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('connect', () => {
    it('should connect to WebSocket server', () => {
      service.connect();
      
      expect(mockWebSocket).toBeDefined();
      expect(mockWebSocket.url).toBe('ws://localhost:8081');
    });

    it('should handle WebSocket open event', (done) => {
      service.connect();
      
      service.connectionStatus$.subscribe(status => {
        if (status === 'connected') {
          expect(status).toBe('connected');
          done();
        }
      });

      mockWebSocket.triggerOpen();
    });

    it('should handle connection error', (done) => {
      service.connect();

      service.connectionStatus$.subscribe(status => {
        if (status === 'error') {
          expect(status).toBe('error');
          done();
        }
      });

      mockWebSocket.triggerError();
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      service.connect();
      mockWebSocket.triggerOpen();
    });

    it('should receive threat messages', (done) => {
      const mockThreat = {
        type: 'threat',
        payload: {
          id: 'threat-123',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Test threat'
        }
      };

      service.messages$.subscribe(message => {
        expect(message).toEqual(mockThreat);
        done();
      });

      mockWebSocket.triggerMessage(mockThreat);
    });

    it('should handle clear-all message', (done) => {
      // First add some data to localStorage
      const existingAlerts = [
        { id: '1', severity: 'high', description: 'Alert 1' },
        { id: '2', severity: 'medium', description: 'Alert 2' }
      ];
      localStorage.setItem('threatAlerts', JSON.stringify(existingAlerts));

      const clearAllMessage = { type: 'clear-all' };

      service.messages$.subscribe(message => {
        expect(message).toEqual(clearAllMessage);
        // Check localStorage is cleared
        expect(localStorage.getItem('threatAlerts')).toBe('[]');
        done();
      });

      mockWebSocket.triggerMessage(clearAllMessage);
    });

    it('should handle delete-one message', (done) => {
      // Setup localStorage with test data
      const alertToDelete = { id: 'delete-me', severity: 'high', description: 'Will be deleted' };
      const alertToKeep = { id: 'keep-me', severity: 'low', description: 'Will be kept' };
      localStorage.setItem('threatAlerts', JSON.stringify([alertToDelete, alertToKeep]));

      const deleteMessage = { type: 'delete-one', payload: { id: 'delete-me' } };

      service.messages$.subscribe(message => {
        expect(message).toEqual(deleteMessage);
        
        // Verify correct alert was removed
        const remainingAlerts = JSON.parse(localStorage.getItem('threatAlerts') || '[]');
        expect(remainingAlerts).toHaveSize(1);
        expect(remainingAlerts[0].id).toBe('keep-me');
        done();
      });

      mockWebSocket.triggerMessage(deleteMessage);
    });

    it('should handle malformed JSON messages gracefully', () => {
      spyOn(console, 'error');

      // Trigger message with invalid JSON (simulate by calling onmessage directly with string)
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { data: 'invalid-json' }));
      }

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('reconnection logic', () => {
    it('should attempt to reconnect after connection loss', (done) => {
      let reconnectAttempts = 0;
      
      // Spy on the private reconnect method by monitoring connection attempts
      const originalConnect = service.connect;
      spyOn(service, 'connect').and.callFake(() => {
        reconnectAttempts++;
        return originalConnect.call(service);
      });

      service.connect();
      mockWebSocket.triggerOpen();

      // Simulate connection loss
      mockWebSocket.triggerClose();

      // Wait a bit for reconnection attempt
      setTimeout(() => {
        expect(reconnectAttempts).toBeGreaterThan(1);
        done();
      }, 3100); // Slightly more than reconnect delay
    });

    it('should not reconnect if manually disconnected', () => {
      const connectSpy = spyOn(service, 'connect').and.callThrough();
      
      service.connect();
      mockWebSocket.triggerOpen();
      
      service.disconnect();
      
      // Reset call count after disconnect
      connectSpy.calls.reset();
      
      // Simulate close event after manual disconnect
      mockWebSocket.triggerClose();

      // Give time for any potential reconnect
      setTimeout(() => {
        expect(connectSpy).not.toHaveBeenCalled();
      }, 3100);
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      service.connect();
      mockWebSocket.triggerOpen();
    });

    it('should send message when connected', () => {
      const sendSpy = spyOn(mockWebSocket, 'send');
      const testMessage = { type: 'test', payload: { data: 'test' } };

      service.sendMessage(testMessage);

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testMessage));
    });

    it('should not send message when disconnected', () => {
      const sendSpy = spyOn(mockWebSocket, 'send');
      mockWebSocket.readyState = MockWebSocket.CLOSED;

      const testMessage = { type: 'test', payload: { data: 'test' } };

      service.sendMessage(testMessage);

      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', () => {
      service.connect();
      mockWebSocket.triggerOpen();

      const closeSpy = spyOn(mockWebSocket, 'close');

      service.disconnect();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should update connection status to disconnected', (done) => {
      service.connect();
      mockWebSocket.triggerOpen();

      service.disconnect();

      service.connectionStatus$.subscribe(status => {
        if (status === 'disconnected') {
          expect(status).toBe('disconnected');
          done();
        }
      });
    });
  });
});