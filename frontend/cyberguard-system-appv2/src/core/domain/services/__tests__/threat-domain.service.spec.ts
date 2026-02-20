import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ThreatDomainService } from '../threat-domain.service';
import { ThreatRepository } from '../../ports/threat.repository';
import { ThreatRequest } from '../../models/threat-request.model';
import { ThreatType } from '../../models/threat-type.enum';
import { ThreatSeverity } from '../../models/threat-severity.enum';

describe('ThreatDomainService', () => {
  let service: ThreatDomainService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      reportThreat: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ThreatDomainService,
        { provide: ThreatRepository, useValue: mockRepository }
      ]
    });

    service = TestBed.inject(ThreatDomainService);
  });

  it('should report threat', () => {
    const threat: ThreatRequest = {
      type: ThreatType.MALWARE,
      severity: ThreatSeverity.HIGH,
      sourceIp: '192.168.1.1',
      description: 'Test malware'
    };

    mockRepository.reportThreat.mockReturnValue(of({ threatId: '123' }));

    service.reportThreat(threat).subscribe(result => {
      expect(result?.threatId).toBe('123');
      expect(mockRepository.reportThreat).toHaveBeenCalledWith(threat);
    });
  });

  it('should identify critical threats', () => {
    const threat: ThreatRequest = {
      type: ThreatType.RANSOMWARE,
      severity: ThreatSeverity.HIGH,
      sourceIp: '192.168.1.1',
      description: 'Test'
    };

    expect(service.isCriticalThreat(threat)).toBe(true);
  });

  it('should calculate threat score', () => {
    const threat: ThreatRequest = {
      type: ThreatType.RANSOMWARE,
      severity: ThreatSeverity.CRITICAL,
      sourceIp: '192.168.1.1',
      description: 'Test'
    };

    const score = service.calculateThreatScore(threat);
    expect(score).toBeGreaterThan(0);
  });
});
