/**
 * Unit Tests: IncidentStatus value-object
 *
 * VERIFICAR: isActiveStatus() retorna true para todos los estados activos
 * VERIFICAR: isActiveStatus() retorna false para CLOSED
 * VERIFICAR: isActiveStatus() retorna false para strings desconocidos
 */
import { describe, it, expect } from '@jest/globals';
import { isActiveStatus, IncidentStatus, ACTIVE_INCIDENT_STATUSES } from '../../../../domain/value-objects/IncidentStatus';

describe('isActiveStatus()', () => {
  it.each(ACTIVE_INCIDENT_STATUSES)(
    'should return true for active status "%s"',
    (status) => {
      expect(isActiveStatus(status)).toBe(true);
    },
  );

  it('should return false for CLOSED', () => {
    expect(isActiveStatus(IncidentStatus.CLOSED)).toBe(false);
  });

  it('should return false for an unknown status string', () => {
    expect(isActiveStatus('unknown-status')).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(isActiveStatus('')).toBe(false);
  });

  it('should be case-sensitive (uppercase should not match)', () => {
    expect(isActiveStatus('OPEN')).toBe(false);
  });
});
