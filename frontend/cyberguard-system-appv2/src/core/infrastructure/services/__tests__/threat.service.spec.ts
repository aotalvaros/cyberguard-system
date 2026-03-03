// Tipo de prueba: Integración
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ThreatService } from '../threat.service';
import { ReportThreatUseCase } from '../../../application/use-cases/report-threat.use-case';
import { ThreatType } from '../../../domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../domain/models/threat-severity.enum';

describe('ThreatService', () => {
  let service: ThreatService;
  let mockReportThreatUseCase: Partial<ReportThreatUseCase>;

  beforeEach(() => {
    mockReportThreatUseCase = { execute: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ThreatService,
        { provide: ReportThreatUseCase, useValue: mockReportThreatUseCase },
      ],
    });

    service = TestBed.inject(ThreatService);
  });

  it('should report threat', () => {
    const threat = {
      type: ThreatType.PHISHING,
      severity: ThreatSeverity.CRITICAL,
      sourceIp: '10.0.0.1',
      description: 'Phishing attempt detected'
    };
    const response = { threatId: 'threat-456' };

    mockReportThreatUseCase.execute = vi.fn().mockReturnValue(of(response));

    service.reportThreat(threat).subscribe((result) => {
      expect(result).toEqual(response);
      expect(mockReportThreatUseCase.execute).toHaveBeenCalledWith(threat);
    });
  });
});
