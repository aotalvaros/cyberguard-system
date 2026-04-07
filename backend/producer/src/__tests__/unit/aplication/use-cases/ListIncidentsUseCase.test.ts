import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ListIncidentsUseCase } from '../../../../application/use-cases/ListIncidentsUseCase';
import { IncidentRepository, IncidentRecord } from '../../../../domain/ports/IncidentRepository';
import { IncidentStatus } from '../../../../domain/value-objects/IncidentStatus';

const makeRecord = (overrides?: Partial<IncidentRecord>): IncidentRecord => ({
  id:          'incident-uuid-1',
  threatId:    'threat-uuid-1',
  title:       'malware desde 192.168.1.1',
  status:      IncidentStatus.OPEN,
  severity:    'high',
  type:        'malware',
  sourceIp:    '192.168.1.1',
  description: 'Malware detected',
  createdBy:   'user-1',
  assignedTo:  null,
  createdAt:   new Date('2026-01-01'),
  updatedAt:   new Date('2026-01-01'),
  ...overrides,
});

describe('ListIncidentsUseCase', () => {
  let useCase: ListIncidentsUseCase;
  let mockRepo: jest.Mocked<IncidentRepository>;

  beforeEach(() => {
    mockRepo = {
      save:                       jest.fn(),
      findAll:                    jest.fn().mockResolvedValue([makeRecord()] as never),
      findById:                   jest.fn(),
      findActiveByThreatId:       jest.fn(),
      findActiveByAssignedUserId: jest.fn(),
      unassignByUserId:           jest.fn(),
    } as unknown as jest.Mocked<IncidentRepository>;

    useCase = new ListIncidentsUseCase(mockRepo);
  });

  it('should return incidents list and correct total', async () => {
    const result = await useCase.execute();
    expect(result.incidents).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should call findAll with undefined when invoked without filters', async () => {
    await useCase.execute();
    expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
  });


  it('should pass status filter to the repository', async () => {
    await useCase.execute({ status: 'open' });
    expect(mockRepo.findAll).toHaveBeenCalledWith({ status: 'open' });
  });

  it('should pass severity filter to the repository', async () => {
    await useCase.execute({ severity: 'high' });
    expect(mockRepo.findAll).toHaveBeenCalledWith({ severity: 'high' });
  });

  it('should pass both status and severity filters simultaneously', async () => {
    await useCase.execute({ status: 'assigned', severity: 'critical' });
    expect(mockRepo.findAll).toHaveBeenCalledWith({ status: 'assigned', severity: 'critical' });
  });

  it('should return empty list when repository returns no incidents', async () => {
    mockRepo.findAll.mockResolvedValueOnce([] as never);
    const result = await useCase.execute();
    expect(result.incidents).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should return the correct total when multiple incidents exist', async () => {
    const records = [makeRecord(), makeRecord({ id: 'incident-2' }), makeRecord({ id: 'incident-3' })];
    mockRepo.findAll.mockResolvedValueOnce(records as never);
    const result = await useCase.execute();
    expect(result.total).toBe(3);
    expect(result.incidents).toHaveLength(3);
  });

  it('should propagate repository errors without catching them', async () => {
    mockRepo.findAll.mockRejectedValueOnce(new Error('DB connection lost') as never);
    await expect(useCase.execute()).rejects.toThrow('DB connection lost');
  });

  it('should propagate non-Error rejections as-is', async () => {
    mockRepo.findAll.mockRejectedValueOnce('network_timeout' as never);
    await expect(useCase.execute()).rejects.toBe('network_timeout');
  });
});
