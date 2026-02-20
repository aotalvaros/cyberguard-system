import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

  describe('exportToJSON', () => {
    it('should create download link and trigger download', () => {
      const mockClick = vi.fn();
      const mockLink = {
        href: '',
        download: '',
        click: mockClick
      };
      
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const alerts: AlertMessage[] = [
        {
          eventId: '1',
          timestamp: Date.now(),
          data: {
            threatId: 't1',
            type: ThreatType.MALWARE,
            severity: ThreatSeverity.HIGH,
            sourceIp: '1.1.1.1',
            description: 'test'
          }
        }
      ];

      service.exportToJSON(alerts);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockLink.download).toContain('alerts-');
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test');

      createElementSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });

  describe('filterAlerts - additional cases', () => {
    const mockAlerts: AlertMessage[] = [
      {
        eventId: '1',
        timestamp: Date.now(),
        data: {
          threatId: 'threat-abc-123',
          type: ThreatType.MALWARE,
          severity: ThreatSeverity.HIGH,
          sourceIp: '192.168.1.100',
          description: 'Malware detected'
        }
      },
      {
        eventId: '2',
        timestamp: Date.now(),
        data: {
          threatId: 'threat-xyz-456',
          type: ThreatType.PHISHING,
          severity: ThreatSeverity.LOW,
          sourceIp: '10.0.0.50',
          description: 'Phishing attempt'
        }
      }
    ];

    it('should filter by sourceIp', () => {
      const result = service.filterAlerts(mockAlerts, '192.168', '', '');
      expect(result.length).toBe(1);
      expect(result[0].data.sourceIp).toBe('192.168.1.100');
    });

    it('should filter by threatId', () => {
      const result = service.filterAlerts(mockAlerts, 'abc-123', '', '');
      expect(result.length).toBe(1);
      expect(result[0].data.threatId).toBe('threat-abc-123');
    });

    it('should combine multiple filters', () => {
      const result = service.filterAlerts(mockAlerts, 'malware', ThreatType.MALWARE, ThreatSeverity.HIGH);
      expect(result.length).toBe(1);
    });

    it('should return empty when no matches', () => {
      const result = service.filterAlerts(mockAlerts, 'nonexistent', '', '');
      expect(result.length).toBe(0);
    });
  });

  describe('calculateStats - edge cases', () => {
    it('should handle null alerts', () => {
      const stats = service.calculateStats(null as any);
      expect(stats.total).toBe(0);
    });

    it('should handle alerts with all severity levels', () => {
      const alerts: AlertMessage[] = [
        { eventId: '1', timestamp: Date.now(), data: { threatId: 't1', type: ThreatType.MALWARE, severity: ThreatSeverity.LOW, sourceIp: '1.1.1.1', description: 'test' } },
        { eventId: '2', timestamp: Date.now(), data: { threatId: 't2', type: ThreatType.MALWARE, severity: ThreatSeverity.MEDIUM, sourceIp: '2.2.2.2', description: 'test' } },
        { eventId: '3', timestamp: Date.now(), data: { threatId: 't3', type: ThreatType.MALWARE, severity: ThreatSeverity.HIGH, sourceIp: '3.3.3.3', description: 'test' } },
        { eventId: '4', timestamp: Date.now(), data: { threatId: 't4', type: ThreatType.MALWARE, severity: ThreatSeverity.CRITICAL, sourceIp: '4.4.4.4', description: 'test' } }
      ];

      const stats = service.calculateStats(alerts);
      expect(stats.total).toBe(4);
      expect(stats.low).toBe(1);
      expect(stats.medium).toBe(1);
      expect(stats.high).toBe(1);
      expect(stats.critical).toBe(1);
    });
  });

  describe('formatDate - additional cases', () => {
    it('should format 0 timestamp', () => {
      const result = service.formatDate(0);
      expect(result).toBe('');
    });

    it('should format valid timestamp to string', () => {
      const timestamp = 1640995200000; // 2022-01-01
      const result = service.formatDate(timestamp);
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('getUniqueTypes - additional cases', () => {
    it('should return multiple unique types', () => {
      const alerts: AlertMessage[] = [
        { eventId: '1', timestamp: Date.now(), data: { threatId: 't1', type: ThreatType.MALWARE, severity: ThreatSeverity.HIGH, sourceIp: '1.1.1.1', description: 'test' } },
        { eventId: '2', timestamp: Date.now(), data: { threatId: 't2', type: ThreatType.PHISHING, severity: ThreatSeverity.HIGH, sourceIp: '2.2.2.2', description: 'test' } },
        { eventId: '3', timestamp: Date.now(), data: { threatId: 't3', type: ThreatType.DDOS, severity: ThreatSeverity.HIGH, sourceIp: '3.3.3.3', description: 'test' } }
      ];

      const types = service.getUniqueTypes(alerts);
      expect(types.length).toBe(3);
      expect(types).toContain(ThreatType.MALWARE);
      expect(types).toContain(ThreatType.PHISHING);
      expect(types).toContain(ThreatType.DDOS);
    });

    it('should handle null alerts', () => {
      const types = service.getUniqueTypes(null as any);
      expect(types.length).toBe(0);
    });

    it('should filter out undefined types', () => {
      const alerts: AlertMessage[] = [
        { eventId: '1', timestamp: Date.now(), data: { threatId: 't1', type: ThreatType.MALWARE, severity: ThreatSeverity.HIGH, sourceIp: '1.1.1.1', description: 'test' } },
        { eventId: '2', timestamp: Date.now(), data: { threatId: 't2', type: undefined as any, severity: ThreatSeverity.HIGH, sourceIp: '2.2.2.2', description: 'test' } }
      ];

      const types = service.getUniqueTypes(alerts);
      expect(types.length).toBe(1);
    });
  });

  describe('exportToJSON - additional cases', () => {
    it('should export empty array', () => {
      const mockClick = vi.fn();
      const mockLink = { href: '', download: '', click: mockClick };
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:empty');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      service.exportToJSON([]);

      expect(mockClick).toHaveBeenCalled();
      expect(mockLink.download).toContain('alerts-');

      vi.restoreAllMocks();
    });

    it('should create blob with correct content type', () => {
      const mockClick = vi.fn();
      const mockLink = { href: '', download: '', click: mockClick };
      let capturedBlob: unknown = null;
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
        capturedBlob = blob;
        return 'blob:test';
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      const alerts: AlertMessage[] = [
        { eventId: '1', timestamp: Date.now(), data: { threatId: 't1', type: ThreatType.MALWARE, severity: ThreatSeverity.HIGH, sourceIp: '1.1.1.1', description: 'test' } }
      ];

      service.exportToJSON(alerts);

      expect(capturedBlob).toBeTruthy();
      expect((capturedBlob as Blob).type).toBe('application/json');

      vi.restoreAllMocks();
    });
  });
});
