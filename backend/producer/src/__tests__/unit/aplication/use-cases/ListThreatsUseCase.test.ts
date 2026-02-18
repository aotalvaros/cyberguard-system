
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ListThreatsUseCase } from '../../../../application/use-cases/ListThreatsUseCase';
import { Threat, ThreatRepository } from '../../../../domain/ports/ThreatRepository';


describe('ListThreatsUseCase', () => {
  let listThreatsUseCase: ListThreatsUseCase;
  let mockRepository: ThreatRepository;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockResolvedValue('' as never),
      findAll: jest.fn().mockResolvedValue([] as never),
      findById: jest.fn().mockResolvedValue(null as never)
    } as unknown as ThreatRepository;

    listThreatsUseCase = new ListThreatsUseCase(mockRepository);
  });

  it('should return threats sorted by newest first', async () => {
    const threat1: Threat = {
      threatId: '1',
      type: 'malware',
      severity: 'high',
      sourceIp: '192.168.1.1',
      description: 'Test',
      timestamp: '2024-01-01T10:00:00Z'
    };

    const threat2: Threat = {
      threatId: '2',
      type: 'intrusion',
      severity: 'critical',
      sourceIp: '192.168.1.2',
      description: 'Test',
      timestamp: '2024-01-02T10:00:00Z'
    };

    jest.mocked(mockRepository.findAll).mockResolvedValue([threat2, threat1]);

    const result = await listThreatsUseCase.execute();

    expect(result.total).toBe(2);
    expect(result.threats).toHaveLength(2);
    expect(result.threats[0].threatId).toBe('2');
    expect(result.threats[1].threatId).toBe('1');
    expect(result.threats[0].timestamp).toBe('2024-01-02T10:00:00Z');
    expect(result.threats[1].timestamp).toBe('2024-01-01T10:00:00Z');
  });

  it('should return empty list when no threats exist', async () => {

    jest.mocked(mockRepository.findAll).mockResolvedValue([]);

    const result = await listThreatsUseCase.execute();


    expect(result.threats).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should convert threats to DTOs with all fields', async () => {
    // ARRANGE
    const threat: Threat = {
      threatId: 'threat-123',
      type: 'ransomware',
      severity: 'critical',
      sourceIp: '192.168.1.100',
      targetIp: '10.0.0.1',
      description: 'Ransomware detected',
      metadata: { signature: 'WannaCry.v2' },
      timestamp: '2024-01-15T10:30:00Z'
    };

    jest.mocked(mockRepository.findAll).mockResolvedValue([threat]);

    // ACT
    const result = await listThreatsUseCase.execute();

    // ASSERT
    const dto = result.threats[0];
    expect(dto.threatId).toBe('threat-123');
    expect(dto.type).toBe('ransomware');
    expect(dto.severity).toBe('critical');
    expect(dto.sourceIp).toBe('192.168.1.100');
    expect(dto.targetIp).toBe('10.0.0.1');
    expect(dto.description).toBe('Ransomware detected');
    expect(dto.metadata).toEqual({ signature: 'WannaCry.v2' });
    expect(dto.timestamp).toBe('2024-01-15T10:30:00Z');
  });

  // ✅ TEST 4: Manejar errores del repositorio
  it('should handle repository errors gracefully', async () => {
    // ARRANGE
    const error = new Error('Database connection failed');
    jest.mocked(mockRepository.findAll).mockRejectedValue(error);

    // ACT & ASSERT
    await expect(listThreatsUseCase.execute()).rejects.toThrow(
      'Failed to retrieve threats'
    );
  });

  // ✅ TEST 5: Retornar timestamp actualizado para amenazas sin timestamp
  it('should projestde timestamp for threats without one', async () => {
    // ARRANGE
    const threatWithoutTimestamp: Threat = {
      threatId: 'threat-123',
      type: 'phishing',
      severity: 'medium',
      sourceIp: '192.168.1.1',
      description: 'Phishing email'
      // timestamp no incluido
    };

    jest.mocked(mockRepository.findAll).mockResolvedValue([threatWithoutTimestamp]);

    // ACT
    const result = await listThreatsUseCase.execute();

    // ASSERT
    expect(result.threats[0].timestamp).toBeDefined();
    // Verifica que el timestamp es una cadena ISO válida
    expect(typeof result.threats[0].timestamp).toBe('string');
    expect(result.threats[0].timestamp.length).toBeGreaterThan(0);
  });

  // ✅ TEST 6: Validar que el repositorio se llama correctamente
  it('should call repository findAll method', async () => {
    // ARRANGE
    jest.mocked(mockRepository.findAll).mockResolvedValue([]);

    // ACT
    await listThreatsUseCase.execute();

    // ASSERT
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
  });

  // ✅ TEST 7: Validar total coincide con cantidad de amenazas
  it('should return correct total count', async () => {
    // ARRANGE
    const threats: Threat[] = Array.from({ length: 5 }, (_, i) => ({
      threatId: `threat-${i}`,
      type: 'malware',
      severity: 'high',
      sourceIp: '192.168.1.1',
      description: 'Test',
      timestamp: `2024-01-0${i + 1}T10:00:00Z`
    }));

    jest.mocked(mockRepository.findAll).mockResolvedValue(threats);

    // ACT
    const result = await listThreatsUseCase.execute();

    // ASSERT
    expect(result.total).toBe(5);
    expect(result.threats.length).toBe(result.total);
  });
});
