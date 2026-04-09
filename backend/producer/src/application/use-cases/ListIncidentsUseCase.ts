import { IncidentRepository, IncidentRecord } from '../../domain/ports/IncidentRepository';
import { UserRepository } from '../../domain/ports/UserRepository';

export interface ListIncidentsFilters {
  status?:   string;
  severity?: string;
}

export interface IncidentRecordWithNames extends IncidentRecord {
  readonly createdByName:  string | null;
  readonly assignedToName: string | null;
}

export interface ListIncidentsOutput {
  incidents: IncidentRecordWithNames[];
  total:     number;
}

export class ListIncidentsUseCase {
  constructor(
    private readonly incidentRepository: IncidentRepository,
    private readonly userRepository:     UserRepository,
  ) {}

  async execute(filters?: ListIncidentsFilters): Promise<ListIncidentsOutput> {
    const incidents = await this.incidentRepository.findAll(filters);

    // Collect unique user IDs that need name resolution
    const userIds = new Set<string>();
    for (const inc of incidents) {
      if (inc.createdBy)  userIds.add(inc.createdBy);
      if (inc.assignedTo) userIds.add(inc.assignedTo);
    }

    // Resolve UUIDs → usernames in a single batch
    const nameMap = new Map<string, string>();
    if (userIds.size > 0) {
      const resolvePromises = [...userIds].map(async (id) => {
        try {
          const user = await this.userRepository.findById(id);
          if (user) nameMap.set(id, user.fullName || user.username);
        } catch { /* ignore — will fall back to null */ }
      });
      await Promise.all(resolvePromises);
    }

    const enriched: IncidentRecordWithNames[] = incidents.map((inc) => ({
      ...inc,
      createdByName:  nameMap.get(inc.createdBy) ?? null,
      assignedToName: inc.assignedTo ? (nameMap.get(inc.assignedTo) ?? null) : null,
    }));

    return { incidents: enriched, total: enriched.length };
  }
}
