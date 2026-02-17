import { describe, it, expect, beforeEach } from '@jest/globals';
import { ThreatDetectedEvent } from '../../../types';

import { threatStore } from '../../../services/threat.store';

describe('ThreatStore', () => {
  beforeEach(() => {
    // Reset store antes de cada test
    (threatStore as any).threats = [];
  });

  const createMockThreat = (overrides?: Partial<ThreatDetectedEvent>): ThreatDetectedEvent => ({
    eventId: `event-${Date.now()}-${Math.random()}`,
    eventType: 'threat.detected',
    timestamp: new Date().toISOString(),
    data: {
      threatId: `threat-${Date.now()}`,
      type: 'malware',
      severity: 'high',
      sourceIp: '192.168.1.100',
      description: 'Test threat description'
    },
    ...overrides
  });

  describe('add', () => {
    it('should add single threat to store', () => {
      const threat = createMockThreat();
      
      threatStore.add(threat);
      
      expect(threatStore.count()).toBe(1);
    });

    it('should add multiple threats', () => {
      const threat1 = createMockThreat();
      const threat2 = createMockThreat();
      const threat3 = createMockThreat();
      
      threatStore.add(threat1);
      threatStore.add(threat2);
      threatStore.add(threat3);
      
      expect(threatStore.count()).toBe(3);
    });

    it('should preserve threat data integrity', () => {
      const threat = createMockThreat({
        eventId: 'specific-event-id',
        data: {
          threatId: 'specific-threat-id',
          type: 'ransomware',
          severity: 'critical',
          sourceIp: '10.0.0.1',
          description: 'Critical ransomware attack'
        }
      });
      
      threatStore.add(threat);
      const retrieved = threatStore.getAll()[0];
      
      expect(retrieved.eventId).toBe('specific-event-id');
      expect(retrieved.data.type).toBe('ransomware');
      expect(retrieved.data.severity).toBe('critical');
    });
  });

  describe('getAll', () => {
    it('should return empty array when store is empty', () => {
      const threats = threatStore.getAll();
      
      expect(threats).toEqual([]);
      expect(Array.isArray(threats)).toBe(true);
    });

    it('should return threats sorted by timestamp descending', () => {
      const oldThreat = createMockThreat({ timestamp: '2024-01-01T10:00:00.000Z' });
      const newThreat = createMockThreat({ timestamp: '2024-01-02T10:00:00.000Z' });
      const middleThreat = createMockThreat({ timestamp: '2024-01-01T15:00:00.000Z' });
      
      threatStore.add(oldThreat);
      threatStore.add(newThreat);
      threatStore.add(middleThreat);
      
      const threats = threatStore.getAll();
      
      expect(threats[0].timestamp).toBe('2024-01-02T10:00:00.000Z');
      expect(threats[1].timestamp).toBe('2024-01-01T15:00:00.000Z');
      expect(threats[2].timestamp).toBe('2024-01-01T10:00:00.000Z');
    });

    it('should return copy of threats array (immutability)', () => {
      const threat = createMockThreat();
      threatStore.add(threat);
      
      const threats1 = threatStore.getAll();
      const threats2 = threatStore.getAll();
      
      expect(threats1).not.toBe(threats2);
      expect(threats1).toEqual(threats2);
    });

    it('should not allow external modification of internal array', () => {
      const threat = createMockThreat();
      threatStore.add(threat);
      
      const threats = threatStore.getAll();
      threats.push(createMockThreat());
      
      expect(threatStore.count()).toBe(1);
    });
  });

  describe('count', () => {
    it('should return 0 for empty store', () => {
      expect(threatStore.count()).toBe(0);
    });

    it('should return correct count after additions', () => {
      threatStore.add(createMockThreat());
      expect(threatStore.count()).toBe(1);
      
      threatStore.add(createMockThreat());
      expect(threatStore.count()).toBe(2);
      
      threatStore.add(createMockThreat());
      expect(threatStore.count()).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle threats with same timestamp', () => {
      const timestamp = '2024-01-15T10:00:00.000Z';
      const threat1 = createMockThreat({ eventId: 'first', timestamp });
      const threat2 = createMockThreat({ eventId: 'second', timestamp });
      
      threatStore.add(threat1);
      threatStore.add(threat2);
      
      expect(threatStore.count()).toBe(2);
    });

    it('should handle threats with optional fields', () => {
      const threatWithOptionals = createMockThreat({
        data: {
          threatId: 'threat-123',
          type: 'phishing',
          severity: 'medium',
          sourceIp: '192.168.1.1',
          targetIp: '10.0.0.1',
          description: 'Phishing attempt',
          metadata: { url: 'http://malicious.com' }
        }
      });
      
      threatStore.add(threatWithOptionals);
      const retrieved = threatStore.getAll()[0];
      
      expect(retrieved.data.targetIp).toBe('10.0.0.1');
      expect(retrieved.data.metadata?.url).toBe('http://malicious.com');
    });

    it('should handle large number of threats', () => {
      const count = 1000;
      for (let i = 0; i < count; i++) {
        threatStore.add(createMockThreat());
      }
      
      expect(threatStore.count()).toBe(count);
      expect(threatStore.getAll().length).toBe(count);
    });
  });
});