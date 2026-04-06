import { IncidentRepository, IncidentRecord } from '../../domain/ports/IncidentRepository';

export interface ListIncidentsFilters {
  status?:   string;
  severity?: string;
}

export interface ListIncidentsOutput {
  incidents: IncidentRecord[];
  total:     number;
}

export class ListIncidentsUseCase {
  constructor(private readonly incidentRepository: IncidentRepository) {}

  async execute(filters?: ListIncidentsFilters): Promise<ListIncidentsOutput> {
    const incidents = await this.incidentRepository.findAll(filters);
    return { incidents, total: incidents.length };
  }
}
