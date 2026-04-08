// Tipo de prueba: Unitario
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { GetThreatsUseCase } from '../get-threats.use-case';
import { ThreatDomainService } from '../../../domain/services/threat-domain.service';
import { ThreatList } from '../../../domain/models/threat-list.model';
import { ThreatType } from '../../../domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../domain/models/threat-severity.enum';


describe('GetThreatsUseCase', () => {
  let useCase: GetThreatsUseCase;
  let mockThreatDomainService: { getThreats: ReturnType<typeof vi.fn> };

  const mockThreatList: ThreatList = {
    threats: [
      {
        threatId: 'threat-1',
        type: ThreatType.MALWARE,
        severity: ThreatSeverity.HIGH,
        sourceIp: '192.168.1.100',
        description: 'Malware detected',
        timestamp: new Date('2026-02-19T10:00:00.000Z')
      },
      {
        threatId: 'threat-2',
        type: ThreatType.PHISHING,
        severity: ThreatSeverity.LOW,
        sourceIp: '192.168.1.200',
        description: 'Phishing attempt',
        timestamp: new Date('2026-02-19T11:00:00.000Z')
      }
    ],
    total: 2
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockThreatDomainService = {
      getThreats: vi.fn().mockReturnValue(of(mockThreatList))
    };

    TestBed.configureTestingModule({
      providers: [
        GetThreatsUseCase,
        { provide: ThreatDomainService, useValue: mockThreatDomainService }
      ]
    });

    useCase = TestBed.inject(GetThreatsUseCase);
  });

  it('should get threats list successfully', async () => {
    const result = await firstValueFrom(useCase.execute());
    
    expect(result.total).toBe(2);
    expect(result.threats).toHaveLength(2);
    expect(result.threats[0].threatId).toBe('threat-1');
    expect(mockThreatDomainService.getThreats).toHaveBeenCalled();
  });
});
