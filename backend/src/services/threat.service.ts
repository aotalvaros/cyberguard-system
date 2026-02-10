import { v4 as uuidv4 } from 'uuid';
import { publishEvent } from '../config/rabbitmq';
import { logger } from '../config/logger';
import { ThreatRequest, ThreatDetectedEvent } from '../types';
import { threatStore } from './threat.store';

export class ThreatService {
  
  async reportThreat(threatData: ThreatRequest): Promise<string> {
    const threatId = uuidv4();
    const eventId = uuidv4();
    
    const event: ThreatDetectedEvent = {
      eventId,
      eventType: 'threat.detected',
      timestamp: new Date().toISOString(),
      data: {
        threatId,
        ...threatData
      }
    };

    // Guardar en memoria
    threatStore.add(event);

    // ⚠️ HUMAN CHECK:
    // La IA no consideraba el routing key dinámico basado en el tipo de amenaza.
    // Esto permite que diferentes workers consuman diferentes tipos de amenazas.
    const routingKey = `threat.detected.${threatData.type}`;
    
    await publishEvent(routingKey, event);

    logger.info('Threat reported and published to RabbitMQ', {
      threatId,
      type: threatData.type,
      severity: threatData.severity,
      routingKey
    });

    return threatId;
  }
}
