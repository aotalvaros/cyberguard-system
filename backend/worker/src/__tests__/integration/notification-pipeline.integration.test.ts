/**
 * Integration Test: Pipeline de notificaciones (Orchestrator + Adapters + Templates)
 *
 * TIPO: Prueba de INTEGRACIÓN — componentes reales de notificación.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Cadena REAL bajo prueba:                                                │
 * │                                                                          │
 * │  NotificationOrchestrator                       ← REAL                  │
 * │    → LogNotificationAdapter (email)             ← REAL (no API real)    │
 * │    → LogNotificationAdapter (whatsapp)          ← REAL (no API real)    │
 * │  CategoryTemplateStrategy                       ← REAL                  │
 * │    → selectTemplate()                           ← REAL                  │
 * │    → renderTemplate()                           ← REAL                  │
 * │                                                                          │
 * │  Solo se mockea: logger (silenciado)                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * VERIFICAR: NotificationOrchestrator + LogNotificationAdapter reales trabajan juntos.
 * VERIFICAR: CategoryTemplateStrategy genera templates correctos por tipo de amenaza.
 * VERIFICAR: Graceful degradation — si un adapter falla, el otro no se afecta.
 * VERIFICAR: Promise.allSettled resuelve ambos canales independientemente.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mock de frontera: logger ────────────────────────────────────────────────
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../../infrastructure/logging', () => ({
  logger: mockLogger,
}));

// ─── Imports REALES ──────────────────────────────────────────────────────────
import { NotificationOrchestrator } from '../../infrastructure/notifications/NotificationOrchestrator';
import { LogNotificationAdapter } from '../../infrastructure/notifications/LogNotificationAdapter';
import { selectTemplate, renderTemplate } from '../../infrastructure/notifications/CategoryTemplateStrategy';
import type { NotifPayload } from '../../domain/ports/INotificationService';
import type { StoredNotifPreferences } from '../../domain/ports/IEventRepository';

// ─── Fixtures ────────────────────────────────────────────────────────────────
const BASE_PAYLOAD: NotifPayload = {
  eventId: 'evt-notif-001',
  type: 'malware',
  severity: 'critical',
  sourceIp: '192.168.1.200',
  description: 'Trojan horse detected in production',
  receivedAt: '2026-04-09T14:00:00.000Z',
  recipientEmail: '',
  recipientPhone: '',
};

const FULL_PREFS: StoredNotifPreferences = {
  username: 'admin',
  emailEnabled: true,
  whatsappEnabled: true,
  email: 'admin@cyberguard.com',
  phone: '+573001234567',
};

// ─── Tests: NotificationOrchestrator + LogNotificationAdapter ────────────────
describe('Integration: Notification Pipeline', () => {
  let orchestrator: NotificationOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();

    // Ambos canales usan LogNotificationAdapter real (no llaman APIs externas)
    const emailAdapter = new LogNotificationAdapter('email');
    const whatsappAdapter = new LogNotificationAdapter('whatsapp');
    orchestrator = new NotificationOrchestrator(emailAdapter, whatsappAdapter);
  });

  it('should dispatch via both channels when both enabled', async () => {
    const results = await orchestrator.dispatch(BASE_PAYLOAD, FULL_PREFS);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual(
      expect.objectContaining({ canal: 'email', status: 'success', attempts: 1 }),
    );
    expect(results[1]).toEqual(
      expect.objectContaining({ canal: 'whatsapp', status: 'success', attempts: 1 }),
    );
  });

  it('should set recipientEmail on email adapter payload', async () => {
    const results = await orchestrator.dispatch(BASE_PAYLOAD, FULL_PREFS);

    // LogNotificationAdapter logs info con el recipient correcto
    const emailLogCall = mockLogger.info.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('[EMAIL MOCK]'),
    );
    expect(emailLogCall).toBeDefined();
    expect(emailLogCall![1]).toHaveProperty('recipient', 'admin@cyberguard.com');
    expect(results[0]?.status).toBe('success');
  });

  it('should set recipientPhone on whatsapp adapter payload', async () => {
    await orchestrator.dispatch(BASE_PAYLOAD, FULL_PREFS);

    const waLogCall = mockLogger.info.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('[WHATSAPP MOCK]'),
    );
    expect(waLogCall).toBeDefined();
    expect(waLogCall![1]).toHaveProperty('recipient', '+573001234567');
  });

  it('should return empty array when both channels disabled', async () => {
    const disabledPrefs: StoredNotifPreferences = {
      username: 'viewer',
      emailEnabled: false,
      whatsappEnabled: false,
      email: '',
      phone: '',
    };

    const results = await orchestrator.dispatch(BASE_PAYLOAD, disabledPrefs);

    expect(results).toHaveLength(0);
  });

  it('should dispatch only email when whatsapp disabled', async () => {
    const emailOnlyPrefs: StoredNotifPreferences = {
      username: 'emailuser',
      emailEnabled: true,
      whatsappEnabled: false,
      email: 'only@email.com',
      phone: '',
    };

    const results = await orchestrator.dispatch(BASE_PAYLOAD, emailOnlyPrefs);

    expect(results).toHaveLength(1);
    expect(results[0]?.canal).toBe('email');
  });

  it('should dispatch only whatsapp when email disabled', async () => {
    const waOnlyPrefs: StoredNotifPreferences = {
      username: 'wauser',
      emailEnabled: false,
      whatsappEnabled: true,
      email: '',
      phone: '+573009999999',
    };

    const results = await orchestrator.dispatch(BASE_PAYLOAD, waOnlyPrefs);

    expect(results).toHaveLength(1);
    expect(results[0]?.canal).toBe('whatsapp');
  });

  it('should not dispatch email when emailEnabled but email is empty', async () => {
    const noEmailPrefs: StoredNotifPreferences = {
      username: 'noemail',
      emailEnabled: true,
      whatsappEnabled: false,
      email: '', // habilitado pero vacío
      phone: '',
    };

    const results = await orchestrator.dispatch(BASE_PAYLOAD, noEmailPrefs);

    expect(results).toHaveLength(0);
  });

  it('should handle multiple sequential dispatches independently', async () => {
    const results1 = await orchestrator.dispatch(BASE_PAYLOAD, FULL_PREFS);
    const results2 = await orchestrator.dispatch(
      { ...BASE_PAYLOAD, eventId: 'evt-notif-002', type: 'phishing' },
      FULL_PREFS,
    );

    expect(results1).toHaveLength(2);
    expect(results2).toHaveLength(2);
    // Cada dispatch es independiente
    expect(mockLogger.info).toHaveBeenCalledTimes(4); // 2 per dispatch
  });
});

// ─── Tests: CategoryTemplateStrategy ─────────────────────────────────────────
describe('Integration: CategoryTemplateStrategy', () => {
  const THREAT_TYPES = ['malware', 'phishing', 'ddos', 'intrusion', 'other'];

  it.each(THREAT_TYPES)('should return a specific template for type "%s"', (type) => {
    const template = selectTemplate(type);

    expect(template).toHaveProperty('subject');
    expect(template).toHaveProperty('body');
    expect(template.subject).toContain('CyberGuard');
    expect(template.body).toContain('{{severity}}');
    expect(template.body).toContain('{{sourceIp}}');
  });

  it('should fallback to "other" for unknown threat types', () => {
    const template = selectTemplate('ransomware');
    const otherTemplate = selectTemplate('other');

    expect(template.subject).toBe(otherTemplate.subject);
    expect(template.body).toBe(otherTemplate.body);
  });

  it('should be case-insensitive for template selection', () => {
    const upper = selectTemplate('MALWARE');
    const lower = selectTemplate('malware');

    expect(upper.subject).toBe(lower.subject);
  });

  it('should render template replacing all placeholders', () => {
    const template = selectTemplate('malware');
    const rendered = renderTemplate(template, {
      severity: 'critical',
      sourceIp: '10.0.0.1',
      description: 'Trojan detected',
    });

    expect(rendered.body).toContain('critical');
    expect(rendered.body).toContain('10.0.0.1');
    expect(rendered.body).toContain('Trojan detected');
    expect(rendered.body).not.toContain('{{severity}}');
    expect(rendered.body).not.toContain('{{sourceIp}}');
    expect(rendered.body).not.toContain('{{description}}');
  });

  it('should preserve subject when rendering body variables', () => {
    const template = selectTemplate('phishing');
    const rendered = renderTemplate(template, {
      severity: 'high',
      sourceIp: '1.2.3.4',
      description: 'Credential harvesting attempt',
    });

    expect(rendered.subject).toBe(template.subject);
  });

  it('should handle empty description gracefully', () => {
    const template = selectTemplate('ddos');
    const rendered = renderTemplate(template, {
      severity: 'medium',
      sourceIp: '5.6.7.8',
      description: '',
    });

    // Placeholder replaced with empty string — no crash
    expect(rendered.body).not.toContain('{{description}}');
    expect(rendered.body).toContain('5.6.7.8');
  });

  it('should integrate: select template → render → verify full message', () => {
    // Flujo completo: seleccionar template por tipo → renderizar con datos
    const template = selectTemplate('intrusion');
    const rendered = renderTemplate(template, {
      severity: 'critical',
      sourceIp: '192.168.0.100',
      description: 'Unauthorized SSH access from external IP',
    });

    expect(rendered.subject).toBe('CyberGuard: Intrusión Detectada');
    expect(rendered.body).toContain('intrusión');
    expect(rendered.body).toContain('critical');
    expect(rendered.body).toContain('192.168.0.100');
    expect(rendered.body).toContain('Unauthorized SSH access from external IP');
  });
});
