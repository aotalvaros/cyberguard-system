// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WebSocketService } from '../websocket.service';
import { WebSocketRepository } from '../../../domain/ports/websocket.repository';
import { of, BehaviorSubject } from 'rxjs';


describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockRepository: {
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    sendCommand: ReturnType<typeof vi.fn>;
    getMessages$: ReturnType<typeof vi.fn>;
    isConnected: ReturnType<typeof vi.fn>;
    getConnectionStatus$: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockRepository = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendCommand: vi.fn(),
      getMessages$: vi.fn().mockReturnValue(of([])),
      isConnected: vi.fn().mockReturnValue(false),
      getConnectionStatus$: vi.fn().mockReturnValue(new BehaviorSubject('DISCONNECTED').asObservable())
    };

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: WebSocketRepository, useValue: mockRepository }
      ]
    });

    service = TestBed.inject(WebSocketService);
  });

  describe('connect', () => {
    it('should call repository connect', () => {
      service.connect();
      expect(mockRepository.connect).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should call repository disconnect', () => {
      service.disconnect();
      expect(mockRepository.disconnect).toHaveBeenCalled();
    });
  });

  describe('getMessages$', () => {
    it('should return observable from repository', () => {
      const mockMessages = [{ eventId: '1', timestamp: Date.now(), data: {} }];
      mockRepository.getMessages$.mockReturnValue(of(mockMessages));

      const result = service.getMessages$();
      
      result.subscribe(messages => {
        expect(messages).toEqual(mockMessages);
      });
      expect(mockRepository.getMessages$).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should send clear-all command', () => {
      service.clearAll();
      expect(mockRepository.sendCommand).toHaveBeenCalledWith({ type: 'clear-all' });
    });
  });

  describe('deleteMessage', () => {
    it('should send delete-one command with eventId', () => {
      service.deleteMessage('event-123');
      expect(mockRepository.sendCommand).toHaveBeenCalledWith({ 
        type: 'delete-one', 
        id: 'event-123' 
      });
    });
  });

  describe('isConnected', () => {
    it('should return true when connected', () => {
      mockRepository.isConnected.mockReturnValue(true);
      expect(service.isConnected()).toBe(true);
    });

    it('should return false when disconnected', () => {
      mockRepository.isConnected.mockReturnValue(false);
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('getConnectionStatus$', () => {
    it('should delegate to repository getConnectionStatus$', () => {
      service.getConnectionStatus$();
      expect(mockRepository.getConnectionStatus$).toHaveBeenCalled();
    });

    it('should return observable with current status', () => {
      const status$ = new BehaviorSubject('CONNECTED');
      mockRepository.getConnectionStatus$.mockReturnValue(status$.asObservable());

      service.getConnectionStatus$().subscribe(status => {
        expect(status).toBe('CONNECTED');
      });
    });
  });
});
