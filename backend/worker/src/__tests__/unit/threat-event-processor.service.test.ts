import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ThreatEventProcessorService } from '../../application/services/ThreatEventProcessorService';

type Payload = { routingKey: string; data: unknown; receivedAt: string };
type HandleMessageFn = (rawData: unknown, routingKey: string) => Promise<Payload>;

jest.mock('../../domain/services/MessageHandler', () => ({
  handleMessage: jest.fn<HandleMessageFn>(),
}));

import { handleMessage } from '../../domain/services/MessageHandler';

const mockedHandleMessage = handleMessage as jest.MockedFunction<HandleMessageFn>;

describe('ThreatEventProcessorService', () => {
  let processThreatEventUseCase: { execute: jest.MockedFunction<(data: unknown, routingKey: string) => Promise<void>> };
  let processDeletedThreatUseCase: { execute: jest.MockedFunction<(data: unknown, routingKey: string) => Promise<void>> };
  let service: ThreatEventProcessorService;

  beforeEach(() => {
    jest.clearAllMocks();

    processThreatEventUseCase = {
      execute: jest.fn<(data: unknown, routingKey: string) => Promise<void>>().mockResolvedValue(undefined),
    };

    processDeletedThreatUseCase = {
      execute: jest.fn<(data: unknown, routingKey: string) => Promise<void>>().mockResolvedValue(undefined),
    };

    service = new ThreatEventProcessorService(
      processThreatEventUseCase,
      processDeletedThreatUseCase,
    );
  });

  it('should process deleted threat events with deleted use case', async () => {
    mockedHandleMessage.mockResolvedValue({
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
    mockedHandleMessage.mockResolvedValue({
      routingKey: 'threat.detected.malware',
      data: { threatId: 'thr-002' },
      receivedAt: '2026-04-08T00:00:00.000Z',
    });

    await service.process({ threatId: 'thr-002' }, 'threat.detected.malware');

    expect(processThreatEventUseCase.execute).toHaveBeenCalledWith({ threatId: 'thr-002' }, 'threat.detected.malware');
    expect(processDeletedThreatUseCase.execute).not.toHaveBeenCalled();
  });
});