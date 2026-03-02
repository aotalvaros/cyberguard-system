// Tipo de prueba: Unitario
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, firstValueFrom } from 'rxjs';
import { DeleteThreatUseCase } from '../delete-threat.use-case';
import { ThreatDomainService } from '../../../domain/services/threat-domain.service';
import { DeleteThreatResult } from '../../../domain/models/delete-threat-result.model';

describe('DeleteThreatUseCase', () => {
  let useCase: DeleteThreatUseCase;
  let mockThreatDomainService: { deleteThreat: ReturnType<typeof vi.fn> };

  const mockDeleteResult: DeleteThreatResult = {
    success: true,
    threatId: 'threat-123',
    message: 'Threat deleted successfully'
  };

  beforeEach(() => {
    mockThreatDomainService = {
      deleteThreat: vi.fn().mockReturnValue(of(mockDeleteResult))
    };

    TestBed.configureTestingModule({
      providers: [
        DeleteThreatUseCase,
        { provide: ThreatDomainService, useValue: mockThreatDomainService }
      ]
    });

    useCase = TestBed.inject(DeleteThreatUseCase);
  });

  it('should delete threat successfully', async () => {
    const result = await firstValueFrom(useCase.execute('threat-123'));
    
    expect(result.success).toBe(true);
    expect(result.threatId).toBe('threat-123');
    expect(result.message).toBe('Threat deleted successfully');
    expect(mockThreatDomainService.deleteThreat).toHaveBeenCalledWith('threat-123');
  });
});
