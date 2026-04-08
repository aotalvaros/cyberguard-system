import { ThreatItem } from './threat-item.model';

export interface ThreatList {
  readonly threats: readonly ThreatItem[];
  readonly total: number;
}
