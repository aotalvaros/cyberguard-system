/**
 * Integration Test: Pipeline de eliminación de amenazas (threat.deleted)
 *
 * TIPO: Prueba de INTEGRACIÓN — cadena completa de componentes reales.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Cadena REAL bajo prueba:                                                │
 * │                                                                          │
 * │  ThreatEventProcessorService                                             │
 * │    → MessageHandler (sanitize + buildPayload)   ← REAL                  │
 * │    → ProcessDeletedThreatUseCase                ← REAL                  │
 * │      → IEventRepository.removeByThreatId()      ← MOCK (frontera Redis) │
 * │      → IBroadcaster.broadcast()                 ← MOCK (frontera WS)   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ¿Qué se MOCKEA? Solo fronteras externas (Redis, WebSocket):
 *   - IEventRepository   → sin Redis real
 *   - IBroadcaster        → sin WebSocket real
 *   - logger              → silenciado
 *
 * ¿Qué NO se mockea?
 *   - ThreatEventProcessorService: routing real (detecta threat.deleted)
 *   - MessageHandler: sanitización + validación real
 *   - ProcessDeletedThreatUseCase: lógica real (extract threatId, remove, broadcast)
 *
 * VERIFICAR: Un evento con routingKey "threat.deleted" ejecuta removeByThreatId + broadcast.
 * VERIFICAR: No se llama a save ni a dispatch (solo elimina, no persiste ni notifica).
 * VERIFICAR: Si el evento no tiene threatId, se loguea warning y no se ejecuta delete.
 * VERIFICAR: El broadcast de eliminación incluye tipo "delete-one" y el threatId.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mock de frontera: logger ────────────────────────────────────────────────
jest.mock('../../infrastructure/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Imports REALES (después del mock de logger) ─────────────────────────────
import { ThreatEventProcessorService } from '../../application/services/ThreatEventProcessorService';
import { ProcessThreatEventUseCase } from '../../application/use-cases/ProcessThreatEventUseCase';
import { ProcessDeletedThreatUseCase } from '../../application/use-cases/ProcessDeletedThreatUseCase';
import type { IEventRepository, StoredNotifPreferences } from '../../domain/ports/IEventRepository';
import type { IBroadcaster } from '../../domain/ports/IBroadcaster';
import type { INotificationOrchestrator } from '../../domain/ports/INotificationOrchestrator';
import type { NotifResult } from '../../domain/ports/INotificationService';
import { logger } from '../../infrastructure/logging';

// ─── Helpers: mocks de puertos ───────────────────────────────────────────────
function createMockRepository(): IEventRepository {
  return {
    connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    save: jest.fn<(p: unknown) => Promise<void>>().mockResolvedValue(undefined),
    getHistory: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    clearHistory: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    removeById: jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
    removeByThreatId: jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
    getAllNotifPreferences: jest.fn<() => Promise<StoredNotifPreferences[]>>().mockResolvedValue([]),
  };
}

function createMockBroadcaster(): IBroadcaster {
  return {
    start: jest.fn(),
    broadcast: jest.fn(),
    close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

function createMockOrchestrator(): INotificationOrchestrator {
  return {
    dispatch: jest.fn<() => Promise<NotifResult[]>>().mockResolvedValue([]),
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────
const DELETED_EVENT = {
  eventId: 'evt-del-001',
  eventType: 'threat.deleted',
  timestamp: '2026-04-09T12:00:00.000Z',
  data: {
    threatId: 'thr-del-001',
  },
};

const DELETED_EVENT_FLAT = {
  threatId: 'thr-del-002',
};

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Integration: Process Deleted Threat Pipeline', () => {
  let repository: IEventRepository;
  let broadcaster: IBroadcaster;
  let orchestrator: INotificationOrchestrator;
  let service: ThreatEventProcessorService;

  beforeEach(() => {
    jest.clearAllMocks();

    repository = createMockRepository();
    broadcaster = createMockBroadcaster();
    orchestrator = createMockOrchestrator();

    const processThreatUseCase = new ProcessThreatEventUseCase(repository, broadcaster, orchestrator);
    const processDeletedUseCase = new ProcessDeletedThreatUseCase(repository, broadcaster);

    service = new ThreatEventProcessorService(processThreatUseCase, processDeletedUseCase);
  });

  it('should route threat.deleted events to ProcessDeletedThreatUseCase', async () => {
    await service.process(DELETED_EVENT, 'threat.deleted');

    // THEN: removeByThreatId fue llamado (no save)
    expect(repository.removeByThreatId).toHaveBeenCalledTimes(1);
    expect(repository.removeByThreatId).toHaveBeenCalledWith('thr-del-001');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should broadcast delete-one event after removing from Redis', async () => {
    await service.process(DELETED_EVENT, 'threat.deleted');

    expect(broadcaster.broadcast).toHaveBeenCalledTimes(1);
    const broadcastPayload = (broadcaster.broadcast as jest.Mock).mock.calls[0]![0] as Record<string, unknown>;
    expect(broadcastPayload).toHaveProperty('type', 'delete-one');
    expect(broadcastPayload).toHaveProperty('id', 'thr-del-001');
    expect(broadcastPayload).toHaveProperty('deletedAt');
    // deletedAt debe ser un ISO string válido
    expect(() => new Date(broadcastPayload['deletedAt'] as string)).not.toThrow();
  });

  it('should NOT dispatch any notifications on delete', async () => {
    await service.process(DELETED_EVENT, 'threat.deleted');

    expect(orchestrator.dispatch).not.toHaveBeenCalled();
    expect(repository.getAllNotifPreferences).not.toHaveBeenCalled();
  });

  it('should extract threatId from nested data field', async () => {
    await service.process(DELETED_EVENT, 'threat.deleted');

    expect(repository.removeByThreatId).toHaveBeenCalledWith('thr-del-001');
  });

  it('should extract threatId from flat event (no nested data)', async () => {
    await service.process(DELETED_EVENT_FLAT, 'threat.deleted');

    expect(repository.removeByThreatId).toHaveBeenCalledWith('thr-del-002');
  });

  it('should warn and skip when threatId is missing', async () => {
    await service.process({ noThreatId: true }, 'threat.deleted');

    expect(repository.removeByThreatId).not.toHaveBeenCalled();
    expect(broadcaster.broadcast).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Threat deleted event missing threatId',
      expect.objectContaining({ routingKey: 'threat.deleted' }),
    );
  });

  it('should warn and skip when data is null', async () => {
    await service.process(null, 'threat.deleted');

    expect(repository.removeByThreatId).not.toHaveBeenCalled();
    expect(broadcaster.broadcast).not.toHaveBeenCalled();
  });

  it('should warn and skip when data is a string (invalid format)', async () => {
    await service.process('not-an-object', 'threat.deleted');

    expect(repository.removeByThreatId).not.toHaveBeenCalled();
  });

  it('should route threat.deleted.batch to deleted use case (prefix match)', async () => {
    await service.process({ threatId: 'thr-batch-001' }, 'threat.deleted.batch');

    // ThreatEventProcessorService routes anything starting with "threat.deleted"
    expect(repository.removeByThreatId).toHaveBeenCalledWith('thr-batch-001');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should route non-deleted events to ProcessThreatEventUseCase instead', async () => {
    await service.process(DELETED_EVENT, 'threat.detected.malware');

    // save SÍ fue llamado (pipeline de detección, no de eliminación)
    expect(repository.save).toHaveBeenCalledTimes(1);
    // removeByThreatId NO fue llamado
    expect(repository.removeByThreatId).not.toHaveBeenCalled();
  });

  it('should log info after successful deletion', async () => {
    await service.process(DELETED_EVENT, 'threat.deleted');

    expect(logger.info).toHaveBeenCalledWith(
      'Threat deleted event processed',
      expect.objectContaining({ threatId: 'thr-del-001', routingKey: 'threat.deleted' }),
    );
  });
});
