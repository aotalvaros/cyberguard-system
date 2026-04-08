// Tipo de prueba: Unitario
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { ThreatDomainService } from '../threat-domain.service';
import { ThreatRepository } from '../../ports/threat.repository';
import { ThreatRequest } from '../../models/threat-request.model';
import { ThreatItem } from '../../models/threat-item.model';
import { ThreatType } from '../../models/threat-type.enum';
import { ThreatSeverity } from '../../models/threat-severity.enum';


describe('ThreatDomainService', () => {
  let service: ThreatDomainService;
  let mockRepository: {
    reportThreat: ReturnType<typeof vi.fn>;
    getThreats: ReturnType<typeof vi.fn>;
    deleteThreat: ReturnType<typeof vi.fn>;
  };

  const mockThreatRequest: ThreatRequest = {
    type: ThreatType.MALWARE,
    severity: ThreatSeverity.HIGH,
    sourceIp: '192.168.1.1',
    description: 'Test malware',
  };

  const mockThreatItem: ThreatItem = {
    threatId: 'threat-1',
    type: ThreatType.MALWARE,
    severity: ThreatSeverity.HIGH,
    sourceIp: '192.168.1.1',
    description: 'Test malware',
    timestamp: new Date(),
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockRepository = {
      reportThreat: vi.fn(),
      getThreats: vi.fn(),
      deleteThreat: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ThreatDomainService,
        { provide: ThreatRepository, useValue: mockRepository },
      ],
    });

    service = TestBed.inject(ThreatDomainService);
  });

  describe('reportThreat', () => {
    it('should delegate to repository and return response', async () => {
      mockRepository.reportThreat.mockReturnValue(of({ threatId: '123' }));

      const result = await firstValueFrom(service.reportThreat(mockThreatRequest));

      expect(result?.threatId).toBe('123');
      expect(mockRepository.reportThreat).toHaveBeenCalledWith(mockThreatRequest);
    });
  });

  describe('getThreats', () => {
    it('should delegate to repository and return threat list', async () => {
      const mockList = { threats: [mockThreatItem], total: 1 };
      mockRepository.getThreats.mockReturnValue(of(mockList));

      const result = await firstValueFrom(service.getThreats());

      expect(result.total).toBe(1);
      expect(result.threats).toHaveLength(1);
      expect(mockRepository.getThreats).toHaveBeenCalled();
    });
  });

  describe('deleteThreat', () => {
    it('should delegate to repository and return delete result', async () => {
      const mockResult = { success: true, message: 'Deleted' };
      mockRepository.deleteThreat.mockReturnValue(of(mockResult));

      const result = await firstValueFrom(service.deleteThreat('threat-1'));

      expect(result.success).toBe(true);
      expect(mockRepository.deleteThreat).toHaveBeenCalledWith('threat-1');
    });
  });

  describe('isCriticalThreat', () => {
    it('should return true for CRITICAL severity', () => {
      const threat: ThreatRequest = { ...mockThreatRequest, severity: ThreatSeverity.CRITICAL };
      expect(service.isCriticalThreat(threat)).toBe(true);
    });

    it('should return true for RANSOMWARE type', () => {
      const threat: ThreatRequest = { ...mockThreatRequest, type: ThreatType.RANSOMWARE, severity: ThreatSeverity.LOW };
      expect(service.isCriticalThreat(threat)).toBe(true);
    });

    it('should return true for DDOS type', () => {
      const threat: ThreatRequest = { ...mockThreatRequest, type: ThreatType.DDOS, severity: ThreatSeverity.LOW };
      expect(service.isCriticalThreat(threat)).toBe(true);
    });

    it('should return false for non-critical threat', () => {
      const threat: ThreatRequest = { ...mockThreatRequest, type: ThreatType.PHISHING, severity: ThreatSeverity.LOW };
      expect(service.isCriticalThreat(threat)).toBe(false);
    });
  });

  describe('isCriticalThreatItem', () => {
    it('should return true for CRITICAL severity item', () => {
      const item: ThreatItem = { ...mockThreatItem, severity: ThreatSeverity.CRITICAL };
      expect(service.isCriticalThreatItem(item)).toBe(true);
    });

    it('should return true for RANSOMWARE type item', () => {
      const item: ThreatItem = { ...mockThreatItem, type: ThreatType.RANSOMWARE, severity: ThreatSeverity.LOW };
      expect(service.isCriticalThreatItem(item)).toBe(true);
    });

    it('should return false for non-critical item', () => {
      const item: ThreatItem = { ...mockThreatItem, type: ThreatType.PHISHING, severity: ThreatSeverity.LOW };
      expect(service.isCriticalThreatItem(item)).toBe(false);
    });
  });

  describe('calculateThreatScore', () => {
    it('should calculate highest score for CRITICAL RANSOMWARE', () => {
      const threat: ThreatRequest = { ...mockThreatRequest, type: ThreatType.RANSOMWARE, severity: ThreatSeverity.CRITICAL };
      const score = service.calculateThreatScore(threat);
      expect(score).toBe(6); // 4 * 1.5
    });

    it('should calculate lowest score for LOW PHISHING', () => {
      const threat: ThreatRequest = { ...mockThreatRequest, type: ThreatType.PHISHING, severity: ThreatSeverity.LOW };
      const score = service.calculateThreatScore(threat);
      expect(score).toBe(1); // 1 * 1.0
    });

    it('should calculate correct score for MEDIUM DDOS', () => {
      const threat: ThreatRequest = { ...mockThreatRequest, type: ThreatType.DDOS, severity: ThreatSeverity.MEDIUM };
      const score = service.calculateThreatScore(threat);
      expect(score).toBe(2.6); // 2 * 1.3
    });
  });

  describe('calculateThreatItemScore', () => {
    it('should calculate score for ThreatItem', () => {
      const item: ThreatItem = { ...mockThreatItem, type: ThreatType.INTRUSION, severity: ThreatSeverity.HIGH };
      const score = service.calculateThreatItemScore(item);
      expect(score).toBeCloseTo(3.3, 5); // 3 * 1.1
    });
  });

  describe('sortThreatsBySeverity', () => {
    it('should sort threats by score descending', () => {
      const threats: ThreatRequest[] = [
        { ...mockThreatRequest, type: ThreatType.PHISHING, severity: ThreatSeverity.LOW },
        { ...mockThreatRequest, type: ThreatType.RANSOMWARE, severity: ThreatSeverity.CRITICAL },
        { ...mockThreatRequest, type: ThreatType.MALWARE, severity: ThreatSeverity.MEDIUM },
      ];

      const sorted = service.sortThreatsBySeverity(threats);

      expect(sorted[0].type).toBe(ThreatType.RANSOMWARE);
      expect(sorted[2].type).toBe(ThreatType.PHISHING);
    });

    it('should not mutate original array', () => {
      const threats: ThreatRequest[] = [
        { ...mockThreatRequest, type: ThreatType.PHISHING, severity: ThreatSeverity.LOW },
        { ...mockThreatRequest, type: ThreatType.RANSOMWARE, severity: ThreatSeverity.CRITICAL },
      ];
      const original = [...threats];

      service.sortThreatsBySeverity(threats);

      expect(threats).toEqual(original);
    });
  });

  describe('sortThreatItemsBySeverity', () => {
    it('should sort threat items by score descending', () => {
      const items: ThreatItem[] = [
        { ...mockThreatItem, type: ThreatType.PHISHING, severity: ThreatSeverity.LOW },
        { ...mockThreatItem, type: ThreatType.RANSOMWARE, severity: ThreatSeverity.CRITICAL },
        { ...mockThreatItem, type: ThreatType.MALWARE, severity: ThreatSeverity.MEDIUM },
      ];

      const sorted = service.sortThreatItemsBySeverity(items);

      expect(sorted[0].type).toBe(ThreatType.RANSOMWARE);
      expect(sorted[2].type).toBe(ThreatType.PHISHING);
    });
  });
});
