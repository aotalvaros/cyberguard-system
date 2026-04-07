import { v4 as uuidv4 } from 'uuid';
import { EventPublisher } from '../../domain/ports/EventPublisher';
import { ThreatRepository } from '../../domain/ports/ThreatRepository';
import { Threat, ThreatType, SeverityLevel } from '../../domain/entities/Threat';
import { ThreatRequest } from '../../types';
import { logger } from '../../infrastructure/config/logger';

export class ThreatService {
  constructor(
    private eventPublisher: EventPublisher,
    private threatRepository: ThreatRepository
  ) {}

  async reportThreat(threatData: ThreatRequest): Promise<string> {
    try {
      const threat = Threat.create({
        type: threatData.type as ThreatType,
        severity: threatData.severity as SeverityLevel,
        sourceIp: threatData.sourceIp,
        targetIp: threatData.targetIp,
        description: threatData.description,
        metadata: threatData.metadata
      });

      const threatId = await this.threatRepository.save({
        threatId: threat.threatId,
        type: threat.type,
        severity: threat.severity,
        sourceIp: threat.sourceIp,
        targetIp: threat.targetIp,
        description: threat.description,
        metadata: threat.metadata,
        timestamp: threat.timestamp
      });

      const routingKey = `threat.detected.${threat.type}`;
      const event = {
        eventId: uuidv4(),
        eventType: 'threat.detected',
        timestamp: threat.timestamp ||  new Date().toISOString(),
        data: {
          threatId,
          type: threat.type,
          severity: threat.severity,
          sourceIp: threat.sourceIp,
          description: threat.description,
          metadata: threat.metadata
        }
      };

      await this.eventPublisher.publish(routingKey, event);

      logger.info('Threat reported successfully', {
        threatId,
        type: threat.type,
        severity: threat.severity,
        routingKey
      });

      return threatId;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to report threat', {
        error: message,
        threatType: threatData.type
      });
      throw error;
    }
  }
}
