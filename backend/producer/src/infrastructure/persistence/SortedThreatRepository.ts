
import { ThreatRepository, Threat } from '../../domain/ports/ThreatRepository';

export class SortedThreatRepository implements ThreatRepository {
  // ✅ Amenazas almacenadas (ordenadas por timestamp descendente)
  private threats: Threat[] = [];

  async save(threat: Threat): Promise<string> {
    const insertIndex = this.findInsertIndex(threat.timestamp || new Date().toISOString());
    this.threats.splice(insertIndex, 0, threat);
    return threat.threatId;
  }


  async findAll(): Promise<Threat[]> {
    // Retorna copia para evitar modificaciones externas
    return [...this.threats];
  }

  async findById(threatId: string): Promise<Threat | null> {
    const threat = this.threats.find(t => t.threatId === threatId);
    return threat || null;
  }

  async delete(threatId: string): Promise<boolean> {
    const index = this.threats.findIndex(t => t.threatId === threatId);
    if (index === -1) return false;
    this.threats.splice(index, 1);
    return true;
  }


  private findInsertIndex(timestamp: string): number {
    const targetTime = new Date(timestamp).getTime();
    let left = 0;
    let right = this.threats.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midTime = new Date(this.threats[mid].timestamp || '').getTime();


      if (midTime > targetTime) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  clear(): void {
    this.threats = [];
  }

  /**
   * Obtener estadísticas del repositorio
   */
  getStats(): {
    total: number;
    oldestTimestamp: string | null;
    newestTimestamp: string | null;
  } {
    return {
      total: this.threats.length,
      newestTimestamp: this.threats[0]?.timestamp || null,
      oldestTimestamp: this.threats[this.threats.length - 1]?.timestamp || null
    };
  }
}
