import { threatStore } from '../services/threat.store';
import { ThreatDetectedEvent } from '../types';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('ThreatStore', () => {
  
  beforeEach(() => {
    // Limpiar store antes de cada test
    (threatStore as any).threats = [];
  });

  const mockThreat: ThreatDetectedEvent = {
    eventId: 'event-123',
    eventType: 'threat.detected',
    timestamp: '2024-01-15T10:00:00.000Z',
    data: {
      threatId: 'threat-123',
      type: 'malware',
      severity: 'high',
      sourceIp: '192.168.1.100',
      description: 'Test threat'
    }
  };

  it('should add threat to store', () => {
    threatStore.add(mockThreat);
    expect(threatStore.count()).toBe(1);
  });

  it('should get all threats sorted by timestamp desc', () => {
    const threat1 = { ...mockThreat, timestamp: '2024-01-15T10:00:00.000Z' };
    const threat2 = { ...mockThreat, timestamp: '2024-01-15T11:00:00.000Z', data: { ...mockThreat.data, threatId: 'threat-456' } };
    
    threatStore.add(threat1);
    threatStore.add(threat2);
    
    const threats = threatStore.getAll();
    expect(threats).toHaveLength(2);
    expect(threats[0].data.threatId).toBe('threat-456'); // Más reciente primero
  });

  it('should get threat by id', () => {
    threatStore.add(mockThreat);
    const found = threatStore.getById('threat-123');
    expect(found).toBeDefined();
    expect(found?.data.threatId).toBe('threat-123');
  });

  it('should return undefined for non-existent threat', () => {
    const found = threatStore.getById('non-existent');
    expect(found).toBeUndefined();
  });

  it('should return correct count', () => {
    expect(threatStore.count()).toBe(0);
    threatStore.add(mockThreat);
    expect(threatStore.count()).toBe(1);
  });
});
