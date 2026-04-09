import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ThreatEventProcessorService } from '../../application/services/ThreatEventProcessorService';

jest.mock('../../domain/services/MessageHandler', () => ({
  handleMessage: jest.fn(),
}));

import { handleMessage } from '../../domain/services/MessageHandler';

describe('ThreatEventProcessorService', () => {
  let processThreatEventUseCase: { execute: jest.Mock };
  let processDeletedThreatUseCase: { execute: jest.Mock };
  let service: ThreatEventProcessorService;

  beforeEach(() => {
    jest.clearAllMocks();

    processThreatEventUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    processDeletedThreatUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    service = new ThreatEventProcessorService(
      processThreatEventUseCase,
      processDeletedThreatUseCase,
    );
  });

  it('should process deleted threat events with deleted use case', async () => {
    (handleMessage as jest.Mock).mockResolvedValue({
      routingKey: 'threat.deleted',
      data: { threatId: 'thr-001' },
      receivedAt: '2026-04-08T00:00:00.000Z',
    });

    await service.process({ threatId: 'thr-001' }, 'threat.deleted');

    expect(handleMessage).toHaveBeenCalledWith({ threatId: 'thr-001' }, 'threat.deleted');
    expect(processDeletedThreatUseCase.execute).toHaveBeenCalledWith({ threatId: 'thr-001' }, 'threat.deleted');
    expect(processThreatEventUseCase.execute).not.toHaveBeenCalled();
  });

  it('should process non-deleted events with threat use case', async () => {
    (handleMessage as jest.Mock).mockResolvedValue({
      routingKey: 'threat.detected.malware',
      data: { threatId: 'thr-002' },
      receivedAt: '2026-04-08T00:00:00.000Z',
    });

    await service.process({ threatId: 'thr-002' }, 'threat.detected.malware');

    expect(processThreatEventUseCase.execute).toHaveBeenCalledWith({ threatId: 'thr-002' }, 'threat.detected.malware');
    expect(processDeletedThreatUseCase.execute).not.toHaveBeenCalled();
  });
});