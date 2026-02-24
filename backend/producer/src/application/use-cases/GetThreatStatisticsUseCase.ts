import type {
  ThreatStatistics,
  ThreatStatisticsRepository,
} from '../../domain/ports/ThreatStatisticsRepository';

/**
 * Application Use Case: GetThreatStatisticsUseCase
 *
 * Orchestrates the retrieval of aggregated threat statistics.
 * Delegates entirely to the ThreatStatisticsRepository port —
 * no transformation, no caching, no additional business logic.
 *
 * Depends on the domain port interface (not a concrete implementation),
 * enabling full substitution with mocks in unit tests.
 */
export class GetThreatStatisticsUseCase {
  constructor(
    private readonly statisticsRepository: ThreatStatisticsRepository
  ) {}

  async execute(): Promise<ThreatStatistics> {
    return this.statisticsRepository.getStatistics();
  }
}
