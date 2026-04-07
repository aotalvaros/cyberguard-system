// Tipo de prueba: Unitario
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { of } from 'rxjs';
import { ReportThreatUseCase } from '../report-threat.use-case';
import { ThreatRepository } from '../../../domain/ports/threat.repository';
import { ThreatType } from '../../../domain/models/threat-type.enum';
import { ThreatSeverity } from '../../../domain/models/threat-severity.enum';


beforeAll(() => {
  TestBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
  );
});

describe('ReportThreatUseCase', () => {
  let useCase: ReportThreatUseCase;
  let mockThreatRepository: Partial<ThreatRepository>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockThreatRepository = {
      reportThreat: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ReportThreatUseCase,
        { provide: ThreatRepository, useValue: mockThreatRepository },
      ],
    });

    useCase = TestBed.inject(ReportThreatUseCase);
  });

  it('should report threat successfully', () => {
    const threat = {
      type: ThreatType.MALWARE,
      severity: ThreatSeverity.HIGH,
      sourceIp: '192.168.1.100',
      description: 'Malware detected on system'
    };
    const response = { threatId: 'threat-123' };

    mockThreatRepository.reportThreat = vi.fn().mockReturnValue(of(response));

    useCase.execute(threat).subscribe((result) => {
      expect(result).toEqual(response);
      expect(mockThreatRepository.reportThreat).toHaveBeenCalledWith(threat);
    });
  });
});
