import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AlertsDomainService } from '../alerts-domain.service';
import { AlertMessage } from '../../models/alert-message.model';
import { ThreatType } from '../../models/threat-type.enum';
import { ThreatSeverity } from '../../models/threat-severity.enum';

describe('AlertsDomainService', () => {
  let service: AlertsDomainService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AlertsDomainService]
    });
    service = TestBed.inject(AlertsDomainService);
  });

  describe('filterAlerts', () => {
    const mockAlerts: AlertMessage[] = [
      {
        eventId: '1',
        eventType: 'threat.detected',
        timestamp: Date.now(),
        data: {
          threatId: 'threat-1',
          type: ThreatType.MALWARE,
          severity: ThreatSeverity.HIGH,
          sourceIp: '192.168.1.1',
          description: 'Malware detected in system'
        }
      },
      {
        eventId: '2',
        eventType: 'threat.detected',
        timestamp: Date.now(),
        data: {
          threatId: 'threat-2',
          type: ThreatType.PHISHING,
          severity: ThreatSeverity.CRITICAL,
          sourceIp: '10.0.0.1',
          description: 'Phishing email detected'
        }
      }
    ];

    it('should filter by search term', () => {
      const result = service.filterAlerts(mockAlerts, 'malware', '', '');
      expect(result.length).toBe(1);
      expect(result[0].data.type).toBe(ThreatType.MALWARE);
    });

    it('should filter by type', () => {
      const result = service.filterAlerts(mockAlerts, '', ThreatType.PHISHING, '');
      expect(result.length).toBe(1);
      expect(result[0].data.type).toBe(ThreatType.PHISHING);
    });

    it('should filter by severity', () => {
      const result = service.filterAlerts(mockAlerts, '', '', ThreatSeverity.CRITICAL);
      expect(result.length).toBe(1);
      expect(result[0].data.severity).toBe(ThreatSeverity.CRITICAL);
    });

    it('should return all alerts when no filters', () => {
      const result = service.filterAlerts(mockAlerts, '', '', '');
      expect(result.length).toBe(2);
    });
  });

  describe('calculateStats', () => {
    it('should calculate stats correctly', () => {
      const alerts: AlertMessage[] = [
        {
          eventId: '1',
          eventType: 'threat',
          timestamp: Date.now(),
          data: {
            threatId: 't1',
            type: ThreatType.MALWARE,
            severity: ThreatSeverity.CRITICAL,
            sourceIp: '1.1.1.1',
            description: 'test'
          }
        },
        {
          eventId: '2',
          eventType: 'threat',
          timestamp: Date.now(),
          data: {
            threatId: 't2',
            type: ThreatType.PHISHING,
            severity: ThreatSeverity.HIGH,
            sourceIp: '2.2.2.2',
            description: 'test'
          }
        }
      ];

      const stats = service.calculateStats(alerts);
      expect(stats.total).toBe(2);
      expect(stats.critical).toBe(1);
      expect(stats.high).toBe(1);
    });

    it('should return zero stats for empty array', () => {
      const stats = service.calculateStats([]);
      expect(stats.total).toBe(0);
      expect(stats.critical).toBe(0);
    });
  });

  describe('getSeverityClass', () => {
    it('should return correct class for each severity', () => {
      expect(service.getSeverityClass('low')).toBe('severity-low');
      expect(service.getSeverityClass('medium')).toBe('severity-medium');
      expect(service.getSeverityClass('high')).toBe('severity-high');
      expect(service.getSeverityClass('critical')).toBe('severity-critical');
    });

    it('should return default class for unknown severity', () => {
      expect(service.getSeverityClass('unknown')).toBe('severity-low');
    });
  });

  describe('formatDate', () => {
    it('should format timestamp correctly', () => {
      const timestamp = new Date('2024-01-01').getTime();
      const result = service.formatDate(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should return empty string for undefined', () => {
      const result = service.formatDate(undefined);
      expect(result).toBe('');
    });
  });

  describe('getUniqueTypes', () => {
    it('should return unique types', () => {
      const alerts: AlertMessage[] = [
        {
          eventId: '1',
          eventType: 'threat',
          timestamp: Date.now(),
          data: {
            threatId: 't1',
            type: ThreatType.MALWARE,
            severity: ThreatSeverity.HIGH,
            sourceIp: '1.1.1.1',
            description: 'test'
          }
        },
        {
          eventId: '2',
          eventType: 'threat',
          timestamp: Date.now(),
          data: {
            threatId: 't2',
            type: ThreatType.MALWARE,
            severity: ThreatSeverity.HIGH,
            sourceIp: '2.2.2.2',
            description: 'test'
          }
        }
      ];

      const types = service.getUniqueTypes(alerts);
      expect(types.length).toBe(1);
      expect(types[0]).toBe(ThreatType.MALWARE);
    });

    it('should return empty array for empty alerts', () => {
      const types = service.getUniqueTypes([]);
      expect(types.length).toBe(0);
    });
  });
});
