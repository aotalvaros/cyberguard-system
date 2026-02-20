import { ThreatRepository } from '../../domain/ports/ThreatRepository';
import { ThreatNotFoundException } from '../../domain/exceptions/ThreatNotFoundException';
import { logger } from '../../infrastructure/config/logger';

export interface DeleteThreatResultDto {
  readonly deleted: boolean;
  readonly threatId: string;
  readonly message: string;
}

export class DeleteThreatUseCase {
  constructor(private readonly threatRepository: ThreatRepository) {}

  async execute(threatId: string): Promise<DeleteThreatResultDto> {
    if (!threatId || threatId.trim().length === 0) {
      throw new Error('Threat ID is required');
    }

    const normalizedId = threatId.trim();

    logger.info('Executing DeleteThreatUseCase', { threatId: normalizedId });

    const existingThreat = await this.threatRepository.findById(normalizedId);

    if (!existingThreat) {
      throw new ThreatNotFoundException(normalizedId);
    }

    const deleted = await this.threatRepository.delete(normalizedId);

    if (!deleted) {
      throw new ThreatNotFoundException(normalizedId);
    }

    logger.info('Threat deleted successfully', { threatId: normalizedId });

    return {
      deleted: true,
      threatId: normalizedId,
      message: `Threat ${normalizedId} deleted successfully`
    };
  }
}
