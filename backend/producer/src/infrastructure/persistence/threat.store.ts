import { ThreatDetectedEvent } from "../../types";


class ThreatStore {
  private threats: ThreatDetectedEvent[] = [];

  add(threat: ThreatDetectedEvent): void {
    this.threats.push(threat);
  }

  getAll(): ThreatDetectedEvent[] {
    return [...this.threats].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  getById(threatId: string): ThreatDetectedEvent | undefined {
    return this.threats.find(t => t.data.threatId === threatId);
  }

  count(): number {
    return this.threats.length;
  }
}

export const threatStore = new ThreatStore();
