import type {
  ThreatStatistics,
  ThreatStatisticsRepository,
} from '../../domain/ports/ThreatStatisticsRepository';

export class GetThreatStatisticsUseCase {
  constructor(
    private readonly statisticsRepository: ThreatStatisticsRepository
  ) {}

  async execute(): Promise<ThreatStatistics> {
    return this.statisticsRepository.getStatistics();
  }
}
