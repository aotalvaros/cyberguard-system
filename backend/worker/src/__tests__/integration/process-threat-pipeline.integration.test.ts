/**
 * Integration Test: Pipeline de procesamiento de amenazas (threat.detected.*)
 *
 * TIPO: Prueba de INTEGRACIÓN — cadena completa de componentes reales.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Cadena REAL bajo prueba:                                                │
 * │                                                                          │
 * │  ThreatEventProcessorService                                             │
 * │    → MessageHandler (sanitize + buildPayload)   ← REAL                  │
 * │    → ProcessThreatEventUseCase                  ← REAL                  │
 * │      → IEventRepository.save()                  ← MOCK (frontera Redis) │
 * │      → IBroadcaster.broadcast()                 ← MOCK (frontera WS)   │
 * │      → INotificationOrchestrator.dispatch()     ← MOCK (frontera APIs) │
 * │      → IEventRepository.getAllNotifPreferences() ← MOCK (frontera Redis)│
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ¿Qué se MOCKEA? Solo fronteras externas (Redis, WebSocket, APIs):
 *   - IEventRepository   → sin Redis real
 *   - IBroadcaster        → sin WebSocket real
 *   - INotificationOrchestrator → sin SendGrid/Twilio reales
 *   - logger              → silenciado
 *
 * ¿Qué NO se mockea?
 *   - ThreatEventProcessorService: routing real (threat.deleted vs otros)
 *   - MessageHandler: sanitización + validación real
 *   - ProcessThreatEventUseCase: pipeline real (save → broadcast → notify)
 *
 * VERIFICAR: El flujo completo threat.detected.* ejecuta save, broadcast y
 *            dispatch en el orden correcto con datos sanitizados.
 * VERIFICAR: Los datos peligrosos son sanitizados antes de persistir.
 * VERIFICAR: Cuando no hay usuarios con preferencias, no se despachan notificaciones.
 * VERIFICAR: Un fallo en notificaciones no interrumpe el flujo (graceful degradation).
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
import type { IEventRepository, StoredNotifPreferences } from '../../domain/ports/IEventRepository';
import type { IBroadcaster } from '../../domain/ports/IBroadcaster';
import type { INotificationOrchestrator } from '../../domain/ports/INotificationOrchestrator';
import type { NotifResult } from '../../domain/ports/INotificationService';
import { logger } from '../../infrastructure/logging';

// ─── Helpers: mocks de puertos ───────────────────────────────────────────────
function createMockRepository(prefs: StoredNotifPreferences[] = []): IEventRepository {
  return {
    connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    save: jest.fn<(p: unknown) => Promise<void>>().mockResolvedValue(undefined),
    getHistory: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
    clearHistory: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    removeById: jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
    removeByThreatId: jest.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
    getAllNotifPreferences: jest.fn<() => Promise<StoredNotifPreferences[]>>().mockResolvedValue(prefs),
  };
}

function createMockBroadcaster(): IBroadcaster {
  return {
    start: jest.fn(),
    broadcast: jest.fn(),
    close: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

function createMockOrchestrator(results: NotifResult[] = []): INotificationOrchestrator {
  return {
    dispatch: jest.fn<() => Promise<NotifResult[]>>().mockResolvedValue(results),
  };
}

// ─── Fixtures ────────────────────────────────────────────────────────────────
const THREAT_EVENT = {
  eventId: 'evt-int-001',
  eventType: 'threat.detected.malware',
  timestamp: '2026-04-09T12:00:00.000Z',
  data: {
    threatId: 'thr-int-001',
    type: 'malware',
    severity: 'critical',
    sourceIp: '192.168.1.100',
    description: 'Ransomware detected in network segment',
  },
};

const USER_PREFS: StoredNotifPreferences = {
  username: 'admin',
  emailEnabled: true,
  whatsappEnabled: true,
  email: 'admin@cyberguard.com',
  phone: '+573001234567',
};

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Integration: Process Threat Pipeline', () => {
  let repository: IEventRepository;
  let broadcaster: IBroadcaster;
  let orchestrator: INotificationOrchestrator;
  let service: ThreatEventProcessorService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function buildPipeline(prefs: StoredNotifPreferences[] = [], notifResults: NotifResult[] = []) {
    repository = createMockRepository(prefs);
    broadcaster = createMockBroadcaster();
    orchestrator = createMockOrchestrator(notifResults);

    const processThreatUseCase = new ProcessThreatEventUseCase(repository, broadcaster, orchestrator);
    const processDeletedUseCase = { execute: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };

    service = new ThreatEventProcessorService(processThreatUseCase, processDeletedUseCase);
  }

  it('should execute full pipeline: sanitize → save → broadcast → notify', async () => {
    buildPipeline([USER_PREFS], [
      { canal: 'email', status: 'success', attempts: 1 },
      { canal: 'whatsapp', status: 'success', attempts: 1 },
    ]);

    await service.process(THREAT_EVENT, 'threat.detected.malware');

    // THEN: save fue llamado con payload sanitizado
    expect(repository.save).toHaveBeenCalledTimes(1);
    const savedPayload = (repository.save as jest.Mock).mock.calls[0]![0] as Record<string, unknown>;
    expect(savedPayload).toHaveProperty('routingKey', 'threat.detected.malware');
    expect(savedPayload).toHaveProperty('data');
    expect(savedPayload).toHaveProperty('receivedAt');

    // THEN: broadcast fue llamado con el mismo payload
    expect(broadcaster.broadcast).toHaveBeenCalledTimes(1);
    expect(broadcaster.broadcast).toHaveBeenCalledWith(savedPayload);

    // THEN: se consultaron preferencias y se despacharon notificaciones
    expect(repository.getAllNotifPreferences).toHaveBeenCalledTimes(1);
    expect(orchestrator.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should sanitize dangerous characters in routingKey before saving', async () => {
    buildPipeline();

    await service.process({ data: {} }, 'threat.<script>"alert"');

    const savedPayload = (repository.save as jest.Mock).mock.calls[0]![0] as Record<string, unknown>;
    expect(savedPayload['routingKey']).toBe('threat.scriptalert');
    expect(savedPayload['routingKey']).not.toContain('<');
    expect(savedPayload['routingKey']).not.toContain('>');
    expect(savedPayload['routingKey']).not.toContain('"');
  });

  it('should warn when string data contains dangerous characters', async () => {
    buildPipeline();

    await service.process('<img onerror=alert(1)>', 'threat.detected.xss');

    expect(logger.warn).toHaveBeenCalledWith('Input contained dangerous characters');
  });

  it('should skip notification dispatch when no users have preferences', async () => {
    buildPipeline([]); // sin preferencias de usuario

    await service.process(THREAT_EVENT, 'threat.detected.malware');

    // save y broadcast SÍ deben ejecutarse
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(broadcaster.broadcast).toHaveBeenCalledTimes(1);
    // pero dispatch NO (no hay usuarios)
    expect(orchestrator.dispatch).not.toHaveBeenCalled();
  });

  it('should dispatch notifications to ALL users with active preferences', async () => {
    const multipleUsers: StoredNotifPreferences[] = [
      { username: 'admin1', emailEnabled: true, whatsappEnabled: false, email: 'a1@test.com', phone: '' },
      { username: 'admin2', emailEnabled: false, whatsappEnabled: true, email: '', phone: '+573009999999' },
      { username: 'admin3', emailEnabled: true, whatsappEnabled: true, email: 'a3@test.com', phone: '+573008888888' },
    ];
    buildPipeline(multipleUsers, [{ canal: 'email', status: 'success', attempts: 1 }]);

    await service.process(THREAT_EVENT, 'threat.detected.phishing');

    // dispatch se llama una vez por usuario
    expect(orchestrator.dispatch).toHaveBeenCalledTimes(3);
  });

  it('should continue processing even when orchestrator throws', async () => {
    const prefs: StoredNotifPreferences[] = [
      { username: 'user1', emailEnabled: true, whatsappEnabled: false, email: 'u1@test.com', phone: '' },
      { username: 'user2', emailEnabled: true, whatsappEnabled: false, email: 'u2@test.com', phone: '' },
    ];
    repository = createMockRepository(prefs);
    broadcaster = createMockBroadcaster();
    orchestrator = {
      dispatch: jest.fn<() => Promise<NotifResult[]>>()
        .mockRejectedValueOnce(new Error('SendGrid 503'))
        .mockResolvedValueOnce([{ canal: 'email', status: 'success', attempts: 1 }]),
    };

    const processThreatUseCase = new ProcessThreatEventUseCase(repository, broadcaster, orchestrator);
    const processDeletedUseCase = { execute: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };
    service = new ThreatEventProcessorService(processThreatUseCase, processDeletedUseCase);

    // No debe lanzar error — graceful degradation
    await expect(service.process(THREAT_EVENT, 'threat.detected.malware')).resolves.not.toThrow();

    // Ambos usuarios fueron intentados (el segundo sí recibió)
    expect(orchestrator.dispatch).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      'Notification dispatch error',
      expect.objectContaining({ username: 'user1', error: 'SendGrid 503' }),
    );
  });

  it('should persist receivedAt as valid ISO 8601 timestamp', async () => {
    buildPipeline();
    const before = new Date();

    await service.process(THREAT_EVENT, 'threat.detected.ddos');

    const after = new Date();
    const savedPayload = (repository.save as jest.Mock).mock.calls[0]![0] as Record<string, unknown>;
    const receivedAt = new Date(savedPayload['receivedAt'] as string);
    expect(receivedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(receivedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should extract notification payload with correct fields from nested event', async () => {
    buildPipeline([USER_PREFS], [{ canal: 'email', status: 'success', attempts: 1 }]);

    await service.process(THREAT_EVENT, 'threat.detected.malware');

    const dispatchCall = (orchestrator.dispatch as jest.Mock).mock.calls[0]!;
    const notifPayload = dispatchCall[0] as Record<string, unknown>;
    expect(notifPayload).toHaveProperty('eventId', 'evt-int-001');
    expect(notifPayload).toHaveProperty('type', 'malware');
    expect(notifPayload).toHaveProperty('severity', 'critical');
    expect(notifPayload).toHaveProperty('sourceIp', '192.168.1.100');
    expect(notifPayload).toHaveProperty('description', 'Ransomware detected in network segment');
  });

  it('should handle event with minimal data (no nested data field)', async () => {
    const minimalEvent = { threatId: 'thr-min-001', type: 'intrusion', severity: 'low', sourceIp: '10.0.0.1' };
    buildPipeline([USER_PREFS], [{ canal: 'email', status: 'success', attempts: 1 }]);

    await service.process(minimalEvent, 'threat.detected.intrusion');

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(broadcaster.broadcast).toHaveBeenCalledTimes(1);
    expect(orchestrator.dispatch).toHaveBeenCalledTimes(1);
  });

  it('should NOT route to processDeletedUseCase for non-deleted events', async () => {
    const processDeletedUseCase = { execute: jest.fn<() => Promise<void>>().mockResolvedValue(undefined) };
    repository = createMockRepository();
    broadcaster = createMockBroadcaster();
    orchestrator = createMockOrchestrator();

    const processThreatUseCase = new ProcessThreatEventUseCase(repository, broadcaster, orchestrator);
    service = new ThreatEventProcessorService(processThreatUseCase, processDeletedUseCase);

    await service.process(THREAT_EVENT, 'threat.detected.malware');

    expect(processDeletedUseCase.execute).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
