import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────
type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const mockQuery = jest.fn<AsyncFn>();
jest.mock('../../../../infrastructure/config/database', () => ({ query: mockQuery }));

const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
jest.mock('../../../../infrastructure/config/logger', () => ({ logger: mockLogger }));

import { PostgresIncidentRepository } from '../../../../infrastructure/persistence/PostgresIncidentRepository';
import { IncidentRecord } from '../../../../domain/ports/IncidentRepository';
import { IncidentStatus } from '../../../../domain/value-objects/IncidentStatus';
import { logger } from '../../../../infrastructure/config/logger';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseRow = {
  id:          'incident-uuid-1',
  threat_id:   'threat-uuid-1',
  title:       'malware desde 192.168.1.1',
  status:      'open',
  severity:    'high',
  type:        'malware',
  source_ip:   '192.168.1.1',
  description: 'Malware detected',
  created_by:  'user-uuid-1',
  assigned_to: null,
  created_at:  new Date('2026-01-01T10:00:00Z'),
  updated_at:  new Date('2026-01-01T10:00:00Z'),
};

const expectedRecord: IncidentRecord = {
  id:          baseRow.id,
  threatId:    baseRow.threat_id,
  title:       baseRow.title,
  status:      baseRow.status,
  severity:    baseRow.severity,
  type:        baseRow.type,
  sourceIp:    baseRow.source_ip,
  description: baseRow.description,
  createdBy:   baseRow.created_by,
  assignedTo:  baseRow.assigned_to,
  createdAt:   baseRow.created_at,
  updatedAt:   baseRow.updated_at,
};

const inputRecord: IncidentRecord = {
  id:          'incident-uuid-1',
  threatId:    'threat-uuid-1',
  title:       'malware desde 192.168.1.1',
  status:      IncidentStatus.OPEN,
  severity:    'high',
  type:        'malware',
  sourceIp:    '192.168.1.1',
  description: 'Malware detected',
  createdBy:   'user-uuid-1',
  assignedTo:  null,
  createdAt:   new Date('2026-01-01T10:00:00Z'),
  updatedAt:   new Date('2026-01-01T10:00:00Z'),
};

// ─────────────────────────────────────────────────────────────────────────────

describe('PostgresIncidentRepository', () => {
  let repo: PostgresIncidentRepository;

  beforeEach(() => {
    repo = new PostgresIncidentRepository();
    jest.clearAllMocks();
  });

  // ── save() ───────────────────────────────────────────────────────────────────

  describe('save()', () => {
    it('should return a mapped IncidentRecord from the inserted row', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repo.save(inputRecord);

      expect(result).toEqual(expectedRecord);
    });

    it('should pass all incident fields to the query', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      await repo.save(inputRecord);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO incidents'),
        expect.arrayContaining([
          inputRecord.id,
          inputRecord.threatId,
          inputRecord.title,
          inputRecord.status,
          inputRecord.severity,
          inputRecord.type,
          inputRecord.sourceIp,
          inputRecord.description,
          inputRecord.createdBy,
          inputRecord.assignedTo,
        ]),
      );
    });

    it('should pass null for sourceIp when it is null', async () => {
      mockQuery.mockResolvedValueOnce([{ ...baseRow, source_ip: null }]);

      await repo.save({ ...inputRecord, sourceIp: null });

      const params = (mockQuery as jest.Mock).mock.calls[0]![1] as unknown[];
      expect(params[6]).toBeNull(); // sourceIp is index 6
    });

    it('should pass null for description when it is null', async () => {
      mockQuery.mockResolvedValueOnce([{ ...baseRow, description: null }]);

      await repo.save({ ...inputRecord, description: null });

      const params = (mockQuery as jest.Mock).mock.calls[0]![1] as unknown[];
      expect(params[7]).toBeNull(); // description is index 7
    });

    it('should pass null for assignedTo when null', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      await repo.save({ ...inputRecord, assignedTo: null });

      const params = (mockQuery as jest.Mock).mock.calls[0]![1] as unknown[];
      expect(params[9]).toBeNull();
    });

    it('should throw when INSERT RETURNING returns no rows', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await expect(repo.save(inputRecord)).rejects.toThrow(
        `INSERT did not return a row for incident ${inputRecord.id}`,
      );
    });

    it('should log success after saving', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      await repo.save(inputRecord);

      expect(logger.info).toHaveBeenCalledWith(
        'Incident saved to DB',
        expect.objectContaining({ incidentId: inputRecord.id }),
      );
    });

    it('should throw and log error when query fails', async () => {
      const dbError = new Error('Unique constraint violated');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repo.save(inputRecord)).rejects.toThrow('Unique constraint violated');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save incident',
        expect.objectContaining({ error: 'Unique constraint violated' }),
      );
    });

    it('should stringify non-Error thrown objects', async () => {
      mockQuery.mockRejectedValueOnce('non_error_string');

      await expect(repo.save(inputRecord)).rejects.toBe('non_error_string');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save incident',
        expect.objectContaining({ error: 'non_error_string' }),
      );
    });
  });

  // ── findAll() ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('should return all incidents without a WHERE clause when no filters', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repo.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedRecord);

      const sql = (mockQuery as jest.Mock).mock.calls[0]![0] as string;
      expect(sql).not.toContain('WHERE');
    });

    it('should return empty array when no rows exist', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repo.findAll();
      expect(result).toEqual([]);
    });

    it('should add WHERE status clause when status filter is provided', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      await repo.findAll({ status: 'open' });

      const sql    = (mockQuery as jest.Mock).mock.calls[0]![0] as string;
      const params = (mockQuery as jest.Mock).mock.calls[0]![1] as unknown[];

      expect(sql).toContain('WHERE');
      expect(sql).toContain('status');
      expect(params).toContain('open');
    });

    it('should add WHERE severity clause when severity filter is provided', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      await repo.findAll({ severity: 'high' });

      const sql    = (mockQuery as jest.Mock).mock.calls[0]![0] as string;
      const params = (mockQuery as jest.Mock).mock.calls[0]![1] as unknown[];

      expect(sql).toContain('severity');
      expect(params).toContain('high');
    });

    it('should add both WHERE clauses when both filters provided', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      await repo.findAll({ status: 'open', severity: 'critical' });

      const sql    = (mockQuery as jest.Mock).mock.calls[0]![0] as string;
      const params = (mockQuery as jest.Mock).mock.calls[0]![1] as unknown[];

      expect(sql).toContain('status');
      expect(sql).toContain('severity');
      expect(params).toContain('open');
      expect(params).toContain('critical');
    });

    it('should order results by created_at DESC', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repo.findAll();

      const sql = (mockQuery as jest.Mock).mock.calls[0]![0] as string;
      expect(sql).toContain('ORDER BY created_at DESC');
    });

    it('should throw and log error on query failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB timeout'));

      await expect(repo.findAll()).rejects.toThrow('DB timeout');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to list incidents',
        expect.objectContaining({ error: 'DB timeout' }),
      );
    });
  });

  // ── findById() ───────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return a mapped record when found', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repo.findById('incident-uuid-1');

      expect(result).toEqual(expectedRecord);
    });

    it('should return null when no row is found', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should query with the correct id parameter', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repo.findById('some-id');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id'),
        ['some-id'],
      );
    });

    it('should throw and log error on query failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(repo.findById('id')).rejects.toThrow('Connection refused');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find incident by id',
        expect.objectContaining({ error: 'Connection refused' }),
      );
    });
  });

  // ── findActiveByThreatId() ────────────────────────────────────────────────────

  describe('findActiveByThreatId()', () => {
    it('should return a mapped record when an active incident is found', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repo.findActiveByThreatId('threat-uuid-1');

      expect(result).toEqual(expectedRecord);
    });

    it('should return null when no active incident exists for the threat', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repo.findActiveByThreatId('threat-uuid-1');

      expect(result).toBeNull();
    });

    it('should filter by threat_id and status != closed', async () => {
      mockQuery.mockResolvedValueOnce([]);

      await repo.findActiveByThreatId('threat-uuid-abc');

      const sql    = (mockQuery as jest.Mock).mock.calls[0]![0] as string;
      const params = (mockQuery as jest.Mock).mock.calls[0]![1] as unknown[];

      expect(sql).toContain('threat_id');
      expect(sql).toContain("status != 'closed'");
      expect(params).toContain('threat-uuid-abc');
    });

    it('should throw and log error on query failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query failed'));

      await expect(repo.findActiveByThreatId('t1')).rejects.toThrow('Query failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find active incident by threatId',
        expect.objectContaining({ error: 'Query failed' }),
      );
    });
  });

  // ── findActiveByAssignedUserId() ──────────────────────────────────────────────

  describe('findActiveByAssignedUserId()', () => {
    it('should return mapped ActiveIncidentRecords', async () => {
      const rows = [{ id: 'inc-1', threat_id: 'thr-1', status: 'open', assigned_to: 'user-1' }];
      mockQuery.mockResolvedValueOnce(rows);

      const result = await repo.findActiveByAssignedUserId('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 'inc-1', threatId: 'thr-1', status: 'open', assignedTo: 'user-1' });
    });

    it('should return empty array when no active incidents', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repo.findActiveByAssignedUserId('user-1');

      expect(result).toEqual([]);
    });

    it('should throw and log error on query failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Timeout'));

      await expect(repo.findActiveByAssignedUserId('user-1')).rejects.toThrow('Timeout');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find active incidents by assigned user',
        expect.objectContaining({ error: 'Timeout' }),
      );
    });
  });

  // ── unassignByUserId() ────────────────────────────────────────────────────────

  describe('unassignByUserId()', () => {
    it('should return the count of unassigned incidents', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'inc-1' }, { id: 'inc-2' }]);

      const result = await repo.unassignByUserId('user-1');

      expect(result).toBe(2);
    });

    it('should return 0 when no incidents are unassigned', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repo.unassignByUserId('user-1');

      expect(result).toBe(0);
    });

    it('should log success with count after unassigning', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'inc-1' }]);

      await repo.unassignByUserId('user-1');

      expect(logger.info).toHaveBeenCalledWith(
        'Incidents unassigned due to user deactivation',
        expect.objectContaining({ userId: 'user-1', count: 1 }),
      );
    });

    it('should throw and log error on query failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Lock timeout'));

      await expect(repo.unassignByUserId('user-1')).rejects.toThrow('Lock timeout');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to unassign incidents for user',
        expect.objectContaining({ error: 'Lock timeout' }),
      );
    });

    it('should stringify non-Error thrown objects in error log', async () => {
      mockQuery.mockRejectedValueOnce('connection_dropped');

      await expect(repo.unassignByUserId('user-1')).rejects.toBe('connection_dropped');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to unassign incidents for user',
        expect.objectContaining({ error: 'connection_dropped' }),
      );
    });
  });
});
