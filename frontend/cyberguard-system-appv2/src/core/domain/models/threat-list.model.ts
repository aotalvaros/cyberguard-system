import { ThreatItem } from './threat-item.model';

/**
 * Modelo de dominio para la lista de amenazas.
 * Representa el resultado de obtener todas las amenazas del sistema.
 */
export interface ThreatList {
  readonly threats: readonly ThreatItem[];
  readonly total: number;
}
