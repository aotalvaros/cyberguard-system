
import { ThreatRepository } from '../../domain/ports/ThreatRepository';
import { logger } from '../../infrastructure/config/logger';

export interface ThreatResponseDto {
  threatId: string;
  type: string;
  severity: string;
  sourceIp: string;
  targetIp?: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}


export class ListThreatsUseCase {
  constructor(private threatRepository: ThreatRepository) {}

  async execute(): Promise<{ threats: ThreatResponseDto[]; total: number }> {
    try {
      logger.info('Executing ListThreatsUseCase');

      // ✅ Delegar al repositorio (que optimiza el retrieval)
      const threats = await this.threatRepository.findAll();

      // ✅ Convertir entidades a DTOs (desacopla representación interna)
      const threatDtos = threats.map(threat => ({
        threatId: threat.threatId,
        type: threat.type,
        severity: threat.severity,
        sourceIp: threat.sourceIp,
        targetIp: threat.targetIp,
        description: threat.description,
        timestamp: threat.timestamp || new Date().toISOString(),
        metadata: threat.metadata
      }));

      logger.info('Threats retrieved successfully', { count: threatDtos.length });

      return {
        threats: threatDtos,
        total: threatDtos.length
      };
    } catch (error: any) {
      logger.error('Failed to list threats', { error: error.message });
      throw new Error('Failed to retrieve threats');
    }
  }
}
