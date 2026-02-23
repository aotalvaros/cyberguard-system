import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { WebSocketRepositoryImpl } from '../websocket-repository.impl';
import { firstValueFrom } from 'rxjs';
import { WS_COMMANDS, STORAGE_KEYS } from '@environments/constants';

describe('WebSocketRepositoryImpl', () => {
  let repository: WebSocketRepositoryImpl;

  beforeEach(() => {
    localStorage.clear();
    
    TestBed.configureTestingModule({
      providers: [WebSocketRepositoryImpl]
    });

    repository = TestBed.inject(WebSocketRepositoryImpl);
  });

  afterEach(() => {
    localStorage.clear();
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
  });

  describe('disconnect', () => {
    it('should set connected to false', () => {
      repository.disconnect();
      expect(repository.isConnected()).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      repository.disconnect();
      repository.disconnect();
      expect(repository.isConnected()).toBe(false);
    });
  });

  describe('localStorage persistence', () => {
    it('should load messages from localStorage on init', async () => {
      const storedMessages = [
        {
          eventId: 'stored-1',
          timestamp: Date.now(),
          data: {
            threatId: 'threat-stored',
            type: 'malware',
            severity: 'high',
            sourceIp: '10.0.0.1',
            description: 'Stored alert'
          }
        }
      ];
      localStorage.setItem(STORAGE_KEYS.WS_HISTORY, JSON.stringify(storedMessages));

      const newRepo = new WebSocketRepositoryImpl();
      
      const messages = await firstValueFrom(newRepo.getMessages$());
      expect(messages.length).toBe(1);
      expect(messages[0].eventId).toBe('stored-1');
    });

    it('should handle invalid JSON in localStorage gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem(STORAGE_KEYS.WS_HISTORY, 'invalid-json');

      const newRepo = new WebSocketRepositoryImpl();
      
      const messages = await firstValueFrom(newRepo.getMessages$());
      expect(messages.length).toBe(0);
      
      consoleSpy.mockRestore();
    });

    it('should handle empty localStorage', async () => {
      localStorage.removeItem(STORAGE_KEYS.WS_HISTORY);
      
      const newRepo = new WebSocketRepositoryImpl();
      const messages = await firstValueFrom(newRepo.getMessages$());
      expect(messages.length).toBe(0);
    });

    it('should filter invalid messages from storage', async () => {
      const storedMessages = [
        {
          eventId: 'valid-1',
          timestamp: Date.now(),
          data: {
            threatId: 'threat-1',
            type: 'malware',
            severity: 'high',
            sourceIp: '10.0.0.1',
            description: 'Valid'
          }
        },
        {
          eventId: 'invalid-no-data',
          timestamp: Date.now()
        }
      ];
      localStorage.setItem(STORAGE_KEYS.WS_HISTORY, JSON.stringify(storedMessages));

      const newRepo = new WebSocketRepositoryImpl();
      const messages = await firstValueFrom(newRepo.getMessages$());
      
      expect(messages.length).toBe(1);
      expect(messages[0].eventId).toBe('valid-1');
    });

    it('should filter messages without threatId from storage', async () => {
      const storedMessages = [
        {
          eventId: 'valid-1',
          data: {
            threatId: 'threat-1',
            type: 'malware',
            severity: 'high',
            sourceIp: '10.0.0.1',
            description: 'Valid'
          }
        },
        {
          eventId: 'invalid-no-threatid',
          data: {
            threatId: '',
            type: 'test',
            severity: 'low',
            sourceIp: '1.1.1.1',
            description: 'No threat id'
          }
        }
      ];
      localStorage.setItem(STORAGE_KEYS.WS_HISTORY, JSON.stringify(storedMessages));

      const newRepo = new WebSocketRepositoryImpl();
      const messages = await firstValueFrom(newRepo.getMessages$());
      
      expect(messages.length).toBe(1);
      expect(messages[0].eventId).toBe('valid-1');
    });
  });
});
