import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketMapper, toAlertMessage, toWebSocketCommandDto } from '../websocket.mapper';
import { WebSocketAlertDto } from '../../dto/websocket.dto';
import { WebSocketCommand } from '../../../domain/models/websocket-command.model';

describe('WebSocketMapper', () => {
  describe('toAlertMessage', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-02-15T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should convert WebSocketAlertDto to AlertMessage', () => {
      const dto: WebSocketAlertDto = {
        eventId: 'evt-123',
        data: {
          threatId: 'threat-456',
          type: 'malware',
          severity: 'high',
          sourceIp: '192.168.1.100',
          description: 'Malware detected'
        },
        receivedAt: '2024-02-15T10:30:00.000Z'
      };

      const result = toAlertMessage(dto);

      expect(result.eventId).toBe('evt-123');
      expect(result.data.threatId).toBe('threat-456');
      expect(result.data.type).toBe('malware');
      expect(result.data.severity).toBe('high');
      expect(result.data.sourceIp).toBe('192.168.1.100');
      expect(result.data.description).toBe('Malware detected');
    });

    it('should convert receivedAt string to timestamp', () => {
      const dto: WebSocketAlertDto = {
        eventId: 'evt-1',
        data: {
          threatId: 't1',
          type: 'phishing',
          severity: 'low',
          sourceIp: '1.1.1.1',
          description: 'Test'
        },
        receivedAt: '2024-02-15T10:30:00.000Z'
      };

      const result = toAlertMessage(dto);

      expect(result.timestamp).toBe(new Date('2024-02-15T10:30:00.000Z').getTime());
    });

    it('should use current time when receivedAt is missing', () => {
      const dto: WebSocketAlertDto = {
        eventId: 'evt-2',
        data: {
          threatId: 't2',
          type: 'ddos',
          severity: 'critical',
          sourceIp: '2.2.2.2',
          description: 'Test'
        }
      };

      const result = toAlertMessage(dto);

      expect(result.timestamp).toBe(Date.now());
    });
  });

  describe('toWebSocketCommandDto', () => {
    it('should convert clear-all command', () => {
      const command: WebSocketCommand = {
        type: 'clear-all'
      };

      const result = toWebSocketCommandDto(command);

      expect(result.type).toBe('clear-all');
      expect(result.id).toBeUndefined();
    });

    it('should convert delete-one command with id', () => {
      const command: WebSocketCommand = {
        type: 'delete-one',
        id: 'threat-to-delete-123'
      };

      const result = toWebSocketCommandDto(command);

      expect(result.type).toBe('delete-one');
      expect(result.id).toBe('threat-to-delete-123');
    });
  });

  describe('WebSocketMapper namespace', () => {
    it('should expose all mapper functions', () => {
      expect(WebSocketMapper.toAlertMessage).toBeDefined();
      expect(WebSocketMapper.toWebSocketCommandDto).toBeDefined();
    });
  });
});
