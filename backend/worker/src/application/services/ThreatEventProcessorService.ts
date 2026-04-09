import { handleMessage } from '../../domain/services/MessageHandler';

interface ThreatEventUseCase {
  execute(data: unknown, routingKey: string): Promise<void>;
}

interface DeletedThreatUseCase {
  execute(data: unknown, routingKey: string): Promise<void>;
}

export class ThreatEventProcessorService {
  constructor(
    private readonly processThreatEventUseCase: ThreatEventUseCase,
    private readonly processDeletedThreatUseCase: DeletedThreatUseCase,
  ) {}

  async process(rawData: unknown, routingKey: string): Promise<void> {
    const payload = await handleMessage(rawData, routingKey);

    if (routingKey.startsWith('threat.deleted')) {
      await this.processDeletedThreatUseCase.execute(payload.data, payload.routingKey);
      return;
    }

    await this.processThreatEventUseCase.execute(payload.data, payload.routingKey);
  }
}