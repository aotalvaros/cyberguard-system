import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mocks primero
jest.mock('uuid', () => ({
  v4: jest.fn()
}));

jest.mock('../../../config/rabbitmq', () => ({
  publishEvent: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
}));

jest.mock('../../../config/logger', () => ({
  logger: {
    info: jest.fn()
  }
}));

jest.mock('../../../services/threat.store', () => ({
  threatStore: {
    add: jest.fn()
  }
}));

import { v4 as uuidv4 } from 'uuid';
import { ThreatService } from '../../../services/threat.service';
import { ThreatRequest } from '../../../types';
import { publishEvent } from '../../../config/rabbitmq';
import { logger } from '../../../config/logger';
import { threatStore } from '../../../services/threat.store';

describe('ThreatService', () => {
  const fixedDate = new Date('2026-02-01T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(fixedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should build event, store it, publish it, and return threatId', async () => {
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('threat-id')
      .mockReturnValueOnce('event-id');

    const service = new ThreatService();

    const threatData: ThreatRequest = {
      type: 'malware',
      severity: 'high',
      sourceIp: '10.0.0.1',
      description: 'Malware detected'
    };

    const result = await service.reportThreat(threatData);

    expect(result).toBe('threat-id');

    const expectedEvent = {
      eventId: 'event-id',
      eventType: 'threat.detected' as const,
      timestamp: fixedDate.toISOString(),
      data: {
        threatId: 'threat-id',
        ...threatData
      }
    };

    expect(threatStore.add).toHaveBeenCalledWith(expectedEvent);
    expect(publishEvent).toHaveBeenCalledWith('threat.detected.malware', expectedEvent);
    expect(logger.info).toHaveBeenCalledWith(
      'Threat reported and published to RabbitMQ',
      {
        threatId: 'threat-id',
        type: 'malware',
        severity: 'high',
        routingKey: 'threat.detected.malware'
      }
    );
  });

  it('should use routing key based on threat type', async () => {
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('t1')
      .mockReturnValueOnce('e1');

    const service = new ThreatService();

    const threatData: ThreatRequest = {
      type: 'phishing',
      severity: 'medium',
      sourceIp: '203.0.113.45',
      description: 'Phishing attempt'
    };

    await service.reportThreat(threatData);

    expect(publishEvent).toHaveBeenCalledWith(
      'threat.detected.phishing',
      expect.objectContaining({
        eventType: 'threat.detected' as const,
        data: expect.objectContaining({ threatId: 't1', type: 'phishing' })
      })
    );
  });

  it('should propagate publish errors after storing the event', async () => {
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('t2')
      .mockReturnValueOnce('e2');

    (publishEvent as jest.Mock).mockRejectedValueOnce(new Error('RabbitMQ down') as never);

    const service = new ThreatService();

    const threatData: ThreatRequest = {
      type: 'ransomware',
      severity: 'critical',
      sourceIp: '192.168.1.10',
      description: 'Ransomware incident'
    };

    await expect(service.reportThreat(threatData)).rejects.toThrow('RabbitMQ down');

    expect(threatStore.add).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledTimes(1);
  });
});