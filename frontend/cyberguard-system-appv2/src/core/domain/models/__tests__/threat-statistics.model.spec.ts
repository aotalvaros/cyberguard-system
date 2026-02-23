import { describe, it, expect } from 'vitest';
import {
  EMPTY_STATISTICS,
  type ThreatStatistics,
} from '../threat-statistics.model';

describe('ThreatStatistics model', () => {
  describe('EMPTY_STATISTICS', () => {
    it('should have totalThreats equal to 0', () => {
      expect(EMPTY_STATISTICS.totalThreats).toBe(0);
    });

    it('should have last24Hours equal to 0', () => {
      expect(EMPTY_STATISTICS.last24Hours).toBe(0);
    });

    it('should have criticalActive equal to 0', () => {
      expect(EMPTY_STATISTICS.criticalActive).toBe(0);
    });

    it('should have byType as empty object', () => {
      expect(EMPTY_STATISTICS.byType).toEqual({});
    });

    it('should have bySeverity as empty object', () => {
      expect(EMPTY_STATISTICS.bySeverity).toEqual({});
    });

    it('should satisfy the ThreatStatistics interface shape', () => {
      const stats: ThreatStatistics = EMPTY_STATISTICS;
      expect(typeof stats.totalThreats).toBe('number');
      expect(typeof stats.last24Hours).toBe('number');
      expect(typeof stats.criticalActive).toBe('number');
      expect(typeof stats.byType).toBe('object');
      expect(typeof stats.bySeverity).toBe('object');
    });
  });
});
