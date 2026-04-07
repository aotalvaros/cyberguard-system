/**
 * Unit Tests: PostgresThreatRepository
 *
 * VERIFICAR: save() inserta la amenaza y retorna el id de la BD.
 * VERIFICAR: findAll() retorna el array completo mapeado.
 * VERIFICAR: findById() retorna la amenaza correcta o null.
 * VERIFICAR: delete() retorna true/false según filas afectadas.
 * VERIFICAR: mapToThreat() convierte la row de pg al tipo Threat correctamente.
 * VALIDAR:   Cada método propaga errores sin silenciarlos.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ── Mock de la capa de BD ─────────────────────────────────────────────────────
type AsyncFn = (...args: unknown[]) => Promise<unknown>;
const mockQuery = jest.fn<AsyncFn>();
jest.mock('../../../../infrastructure/config/database', () => ({ query: mockQuery }));
jest.mock('../../../../infrastructure/config/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { PostgresThreatRepository } from '../../../../infrastructure/persistence/PostgresThreatRepository';
import type { Threat } from '../../../../domain/ports/ThreatRepository';
import { logger } from '../../../../infrastructure/config/logger';

// ─────────────────────────────────────────────────────────────────────────────

const baseThreat: Threat = {
  threatId:    'threat-uuid-1',
  type:        'malware',
  severity:    'high',
  sourceIp:    '192.168.1.10',
  targetIp:    '10.0.0.1',
  description: 'Malware detected',
  metadata:    { hash: 'abc123' },
  timestamp:   '2026-02-25T10:00:00.000Z',
};

const baseRow = {
  id:          'db-id-1',
  event_id:    'threat-uuid-1',
  type:        'malware',
  severity:    'high',
  source_ip:   '192.168.1.10',
  target_ip:   '10.0.0.1',
  description: 'Malware detected',
  payload:     { hash: 'abc123' },
  created_at:  '2026-02-25T10:00:00.000Z',
};

describe('PostgresThreatRepository', () => {
  let repository: PostgresThreatRepository;

  beforeEach(() => {
    repository = new PostgresThreatRepository();
    jest.clearAllMocks();
  });

  // ── save ─────────────────────────────────────────────────────────────────
  describe('save()', () => {
    it('should return the threat event_id (UUID) after successful INSERT', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'db-id-1' }]);

      const result = await repository.save(baseThreat);

      expect(result).toBe(baseThreat.threatId);
    });

    it('should return threatId even when no row is returned', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.save(baseThreat);

      expect(result).toBe(baseThreat.threatId);
    });

    it('should pass null for targetIp when it is absent', async () => {
      const threatWithoutTarget = { ...baseThreat, targetIp: undefined };
      mockQuery.mockResolvedValueOnce([{ id: 'db-id-2' }]);

      await repository.save(threatWithoutTarget);

      const passedParams = mockQuery.mock.calls[0]?.[1] as unknown[];
      expect(passedParams?.[4]).toBeNull(); // targetIp is 5th param (index 4)
    });

    it('should pass null for metadata when it is absent', async () => {
      const threatWithoutMeta = { ...baseThreat, metadata: undefined };
      mockQuery.mockResolvedValueOnce([{ id: 'db-id-3' }]);

      await repository.save(threatWithoutMeta);

      const passedParams = mockQuery.mock.calls[0]?.[1] as unknown[];
      expect(passedParams?.[6]).toBeNull(); // metadata/payload is 7th param (index 6)
    });

    it('should log success after saving', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'db-id-1' }]);

      await repository.save(baseThreat);

      expect(logger.info).toHaveBeenCalledWith(
        'Threat saved to PostgreSQL',
        expect.objectContaining({ threatId: baseThreat.threatId }),
      );
    });

    it('should propagate and log database errors', async () => {
      const dbError = new Error('unique constraint violation');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(repository.save(baseThreat)).rejects.toThrow('unique constraint violation');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save threat to PostgreSQL',
        expect.objectContaining({ error: 'unique constraint violation' }),
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('should return mapped array of threats', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]?.threatId).toBe('threat-uuid-1');
      expect(result[0]?.type).toBe('malware');
    });

    it('should return empty array when no threats exist', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('table not found'));

      await expect(repository.findAll()).rejects.toThrow('table not found');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch threats from PostgreSQL',
        expect.objectContaining({ error: 'table not found' }),
      );
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────
  describe('findById()', () => {
    it('should return the threat when found', async () => {
      mockQuery.mockResolvedValueOnce([baseRow]);

      const result = await repository.findById('threat-uuid-1');

      expect(result).not.toBeNull();
      expect(result?.threatId).toBe('threat-uuid-1');
    });

    it('should return null when no rows match', async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('query error'));

      await expect(repository.findById('any-id')).rejects.toThrow('query error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find threat by ID',
        expect.objectContaining({ error: 'query error' }),
      );
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('should return true when the threat was deleted', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'db-id-1' }]); // one row returned → deleted

      const result = await repository.delete('threat-uuid-1');

      expect(result).toBe(true);
    });

    it('should return false when no rows were deleted', async () => {
      mockQuery.mockResolvedValueOnce([]); // empty → not found

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should log success when a threat is deleted', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'db-id-1' }]);

      await repository.delete('threat-uuid-1');

      expect(logger.info).toHaveBeenCalledWith(
        'Threat deleted from PostgreSQL',
        { threatId: 'threat-uuid-1' },
      );
    });

    it('should propagate and log database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('foreign key violation'));

      await expect(repository.delete('threat-uuid-1')).rejects.toThrow('foreign key violation');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete threat from PostgreSQL',
        expect.objectContaining({ error: 'foreign key violation' }),
      );
    });
  });

  // ── mapToThreat (via findAll) ─────────────────────────────────────────────
  describe('row → Threat mapping', () => {
    it('should map targetIp from target_ip column', async () => {
      mockQuery.mockResolvedValueOnce([{ ...baseRow, target_ip: '10.0.0.99' }]);
      const [threat] = await repository.findAll();
      expect(threat?.targetIp).toBe('10.0.0.99');
    });

    it('should omit targetIp when target_ip is null', async () => {
      mockQuery.mockResolvedValueOnce([{ ...baseRow, target_ip: null }]);
      const [threat] = await repository.findAll();
      expect(threat).not.toHaveProperty('targetIp');
    });

    it('should map payload to metadata', async () => {
      mockQuery.mockResolvedValueOnce([{ ...baseRow, payload: { sig: 'deadbeef' } }]);
      const [threat] = await repository.findAll();
      expect(threat?.metadata).toEqual({ sig: 'deadbeef' });
    });

    it('should omit metadata when payload is null', async () => {
      mockQuery.mockResolvedValueOnce([{ ...baseRow, payload: null }]);
      const [threat] = await repository.findAll();
      expect(threat).not.toHaveProperty('metadata');
    });

    it('should map created_at to timestamp', async () => {
      mockQuery.mockResolvedValueOnce([{ ...baseRow, created_at: '2026-01-01T00:00:00.000Z' }]);
      const [threat] = await repository.findAll();
      expect(threat?.timestamp).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  // ── Non-Error throws – String(error) branch ───────────────────────────────
  describe('Non-Error error stringification', () => {
    it('should stringify non-Error thrown from save()', async () => {
      mockQuery.mockRejectedValueOnce('raw string error' as never);
      await expect(repository.save(baseThreat)).rejects.toBe('raw string error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save threat to PostgreSQL',
        expect.objectContaining({ error: 'raw string error' }),
      );
    });

    it('should stringify non-Error thrown from findAll()', async () => {
      mockQuery.mockRejectedValueOnce('raw list error' as never);
      await expect(repository.findAll()).rejects.toBe('raw list error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch threats from PostgreSQL',
        expect.objectContaining({ error: 'raw list error' }),
      );
    });

    it('should stringify non-Error thrown from findById()', async () => {
      mockQuery.mockRejectedValueOnce('raw find error' as never);
      await expect(repository.findById('any-id')).rejects.toBe('raw find error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to find threat by ID',
        expect.objectContaining({ error: 'raw find error' }),
      );
    });

    it('should stringify non-Error thrown from delete()', async () => {
      mockQuery.mockRejectedValueOnce('raw delete error' as never);
      await expect(repository.delete('any-id')).rejects.toBe('raw delete error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to delete threat from PostgreSQL',
        expect.objectContaining({ error: 'raw delete error' }),
      );
    });
  });
});
