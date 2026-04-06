# Tasks: External Notifications
**Feature ID:** `external-notifications`
**Plan:** `.specify/specs/external-notifications/plan.md`
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026
**Estimación total:** ~5h

> **Convención:**
> - `[ ]` tarea pendiente · `[x]` completada
> - `[P]` puede ejecutarse en paralelo con otras `[P]` del mismo grupo
> - Orden TDD obligatorio: RED → GREEN → REFACTOR
> - Rama: `feature/ep-03/external-notifications`

---

## Resumen

| ID | Tarea | Capa | Estimación |
|----|-------|------|-----------|
| TASK-01 | Instalar deps Worker + crear rama | Worker/Infra | 10 min |
| TASK-02 | [RED] Tests `CategoryTemplateStrategy` | Worker/Domain | 15 min |
| TASK-03 | [GREEN] Impl `CategoryTemplateStrategy` | Worker/Domain | 15 min |
| TASK-04 | [RED] Tests `EmailAdapter` | Worker/Infra | 20 min |
| TASK-05 | [GREEN] Impl `EmailAdapter` + backoff | Worker/Infra | 30 min |
| TASK-06 | [RED] Tests `WhatsAppAdapter` | Worker/Infra | 20 min |
| TASK-07 | [GREEN] Impl `WhatsAppAdapter` + backoff | Worker/Infra | 25 min |
| TASK-08 | [RED] Tests `NotificationOrchestrator` | Worker/Infra | 20 min |
| TASK-09 | [GREEN] Impl `NotificationOrchestrator` | Worker/Infra | 25 min |
| TASK-10 | [GREEN] Ampliar `redis.ts` + `config.ts` + `index.ts` | Worker/Infra | 20 min |
| TASK-11 | Instalar Redis en Producer + crear `redis.ts` | Backend/Infra | 15 min |
| TASK-12 | [RED] Tests `GetNotificationPreferencesUseCase` (BE) | Backend/App | 15 min |
| TASK-13 | [GREEN] Entidad + port + `GetNotificationPreferencesUseCase` | Backend/Domain | 20 min |
| TASK-14 | [RED] Tests `SaveNotificationPreferencesUseCase` (BE) | Backend/App | 15 min |
| TASK-15 | [GREEN] `RedisNotificationPreferencesRepository` + `SaveNotificationPreferencesUseCase` | Backend/Infra | 20 min |
| TASK-16 | [RED] Tests `profile-notifications.controller` | Backend/Infra | 20 min |
| TASK-17 | [GREEN] Impl controller + Joi schema + wiring | Backend/Infra | 25 min |
| TASK-18 | [RED] Tests use cases Frontend | Frontend/App | 15 min |
| TASK-19 | [GREEN] Model + port + HTTP impl + use cases Frontend | Frontend/App | 25 min |
| TASK-20 | [RED] Tests `NotificationPreferencesComponent` | Frontend/UI | 20 min |
| TASK-21 | [GREEN] Impl `NotificationPreferencesComponent` ts + html + css | Frontend/UI | 30 min |
| TASK-22 | [GREEN] Wiring en `app.config.ts` + Dashboard | Frontend/Infra | 10 min |
| TASK-23 | Verificación suite completa | — | 10 min |

---

## FASE 1 — Worker: Notificaciones Externas

### TASK-01 · Instalar deps Worker + crear rama
**Estimación:** 10 min

- [ ] Crear rama `feature/ep-03/external-notifications` desde `feature/ep-02/real-time-notifications`:
  ```bash
  git checkout -b feature/ep-03/external-notifications
  ```
- [ ] Instalar dependencias en el Worker:
  ```bash
  cd backend/worker
  npm install @sendgrid/mail axios
  npm install -D @types/axios  # si no viene con axios
  ```
- [ ] Crear directorio `backend/worker/src/notifications/`
- [ ] Crear archivo `backend/worker/src/notifications/notification.types.ts`:
  ```typescript
  export interface NotifPayload {
    eventId: string;
    type: string;
    severity: string;
    sourceIp: string;
    description: string;
    receivedAt: string;
    recipientEmail: string;
    recipientPhone: string;
  }

  export interface NotifResult {
    canal: 'email' | 'whatsapp';
    status: 'success' | 'error';
    attempts: number;
    error?: string;
  }

  export interface INotificationService {
    send(payload: NotifPayload): Promise<NotifResult>;
  }
  ```

**Verificación:** `cd backend/worker && npx tsc --noEmit` sin errores.

---

### TASK-02 · [RED] Tests `CategoryTemplateStrategy`
**Estimación:** 15 min  
**Archivo:** `backend/worker/src/__tests__/unit/category-template.strategy.test.ts`

- [ ] Crear el test file con los siguientes casos:
  ```typescript
  import { selectTemplate } from '../../notifications/category-template.strategy';

  describe('CategoryTemplateStrategy', () => {
    it('should return malware template for "malware"', () => {
      const t = selectTemplate('malware');
      expect(t.subject).toContain('Malware');
      expect(t.body).toBeTruthy();
    });

    it('should return phishing template for "phishing"', () => {
      const t = selectTemplate('phishing');
      expect(t.subject).toContain('Phishing');
    });

    it('should return ddos template for "ddos"', () => {
      const t = selectTemplate('ddos');
      expect(t.subject).toContain('DDoS');
    });

    it('should return intrusion template for "intrusion"', () => {
      const t = selectTemplate('intrusion');
      expect(t.subject).toContain('Intrusi');
    });

    it('should return other template for "other"', () => {
      const t = selectTemplate('other');
      expect(t.subject).toBeTruthy();
      expect(t.body).toBeTruthy();
    });

    it('should fallback to "other" template for unknown types', () => {
      const t = selectTemplate('unknown-type');
      const other = selectTemplate('other');
      expect(t.subject).toBe(other.subject);
    });

    it('each type should have a different subject', () => {
      const types = ['malware', 'phishing', 'ddos', 'intrusion'];
      const subjects = types.map(t => selectTemplate(t).subject);
      const unique = new Set(subjects);
      expect(unique.size).toBe(types.length);
    });
  });
  ```
- [ ] Confirmar RED: `cd backend/worker && npx jest category-template` → falla (módulo no existe)

---

### TASK-03 · [GREEN] Impl `CategoryTemplateStrategy`
**Estimación:** 15 min  
**Archivo:** `backend/worker/src/notifications/category-template.strategy.ts`

- [ ] Crear implementación:
  ```typescript
  export interface NotifTemplate {
    subject: string;
    body: string;
  }

  const TEMPLATES: Record<string, NotifTemplate> = {
    malware: {
      subject: '🚨 CyberGuard: Malware Detectado',
      body: 'Se ha detectado actividad de malware en el sistema. Tipo: malware. Revise el panel de alertas inmediatamente.',
    },
    phishing: {
      subject: '⚠️ CyberGuard: Intento de Phishing',
      body: 'Se ha detectado un intento de phishing. Verifique los accesos recientes y revise el panel de alertas.',
    },
    ddos: {
      subject: '🔥 CyberGuard: Ataque DDoS en Curso',
      body: 'Se está registrando un ataque DDoS. El sistema puede estar experimentando degradación. Acceda al panel de alertas.',
    },
    intrusion: {
      subject: '🛑 CyberGuard: Intrusión Detectada',
      body: 'Se ha detectado una intrusión en el sistema. Tome medidas inmediatas y revise el panel de alertas.',
    },
    other: {
      subject: '⚡ CyberGuard: Alerta de Seguridad',
      body: 'Se ha registrado un evento de seguridad en el sistema. Revise el panel de alertas para más detalles.',
    },
  };

  export const selectTemplate = (type: string): NotifTemplate =>
    TEMPLATES[type.toLowerCase()] ?? TEMPLATES['other'];
  ```
- [ ] Confirmar GREEN: `cd backend/worker && npx jest category-template` → 7 tests PASS

---

### TASK-04 · [RED] Tests `EmailAdapter`
**Estimación:** 20 min  
**Archivo:** `backend/worker/src/__tests__/unit/email.adapter.test.ts`

- [ ] Crear el test file con mock de `@sendgrid/mail`:
  ```typescript
  import { EmailAdapter } from '../../notifications/email.adapter';
  import type { NotifPayload } from '../../notifications/notification.types';

  jest.mock('@sendgrid/mail', () => ({
    setApiKey: jest.fn(),
    send: jest.fn(),
  }));

  const sgMail = jest.requireMock('@sendgrid/mail');

  const mockPayload: NotifPayload = {
    eventId: 'evt-001',
    type: 'malware',
    severity: 'high',
    sourceIp: '10.0.0.1',
    description: 'Malware detected',
    receivedAt: '2026-04-06T00:00:00Z',
    recipientEmail: 'admin@cyberguard.com',
    recipientPhone: '+573001234567',
  };

  describe('EmailAdapter', () => {
    let adapter: EmailAdapter;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      adapter = new EmailAdapter('test-api-key', 'noreply@cyberguard.com');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return success on first attempt', async () => {
      sgMail.send.mockResolvedValueOnce([{ statusCode: 202 }]);
      const result = await adapter.send(mockPayload);
      expect(result.status).toBe('success');
      expect(result.canal).toBe('email');
      expect(result.attempts).toBe(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      sgMail.send
        .mockRejectedValueOnce(new Error('500 Internal'))
        .mockResolvedValueOnce([{ statusCode: 202 }]);

      const promise = adapter.send(mockPayload);
      jest.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.status).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('should return error after 3 failed attempts', async () => {
      sgMail.send.mockRejectedValue(new Error('API error'));

      const promise = adapter.send(mockPayload);
      jest.advanceTimersByTime(1000);
      jest.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.status).toBe('error');
      expect(result.attempts).toBe(3);
      expect(result.error).toBeTruthy();
    });

    it('should NOT throw even after all retries exhausted', async () => {
      sgMail.send.mockRejectedValue(new Error('fatal'));
      const promise = adapter.send(mockPayload);
      jest.advanceTimersByTime(5000);
      await expect(promise).resolves.toMatchObject({ status: 'error', canal: 'email' });
    });
  });
  ```
- [ ] Confirmar RED: módulo `email.adapter` no existe → falla

---

### TASK-05 · [GREEN] Impl `EmailAdapter` + backoff
**Estimación:** 30 min  
**Archivo:** `backend/worker/src/notifications/email.adapter.ts`

- [ ] Crear `EmailAdapter` con:
  - Constructor: `(apiKey: string, fromEmail: string, maxRetries = 3)`
  - `send(payload: NotifPayload): Promise<NotifResult>` — no lanza nunca
  - Backoff: `min(1000 * 2^attempt, 30000)ms` entre reintentos
  - Usa `selectTemplate(payload.type)` para el asunto/cuerpo
  - Usa `@sendgrid/mail`: `sgMail.setApiKey(apiKey)` en constructor, `sgMail.send(...)` en send
  - Retorna `NotifResult` con `canal: 'email'`, `status`, `attempts`, `error?`
- [ ] Confirmar GREEN: `cd backend/worker && npx jest email.adapter` → 4 tests PASS

---

### TASK-06 · [RED] Tests `WhatsAppAdapter`
**Estimación:** 20 min  
**Archivo:** `backend/worker/src/__tests__/unit/whatsapp.adapter.test.ts`

- [ ] Crear test file con mock de `axios`:
  ```typescript
  import { WhatsAppAdapter } from '../../notifications/whatsapp.adapter';
  import type { NotifPayload } from '../../notifications/notification.types';
  import axios from 'axios';

  jest.mock('axios');
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  const mockPayload: NotifPayload = {
    eventId: 'evt-002',
    type: 'phishing',
    severity: 'critical',
    sourceIp: '10.0.0.2',
    description: 'Phishing attempt',
    receivedAt: '2026-04-06T00:00:00Z',
    recipientEmail: 'admin@cyberguard.com',
    recipientPhone: '+573001234567',
  };

  describe('WhatsAppAdapter', () => {
    let adapter: WhatsAppAdapter;

    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllMocks();
      adapter = new WhatsAppAdapter('wa-token', 'phone-number-id');
    });

    afterEach(() => jest.useRealTimers());

    it('should return success on first attempt', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.123' }] } });
      const result = await adapter.send(mockPayload);
      expect(result.status).toBe('success');
      expect(result.canal).toBe('whatsapp');
      expect(result.attempts).toBe(1);
    });

    it('should retry on failure and succeed on second attempt', async () => {
      mockedAxios.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { messages: [{ id: 'wamid.456' }] } });

      const promise = adapter.send(mockPayload);
      jest.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.status).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('should return error after 3 failed attempts', async () => {
      mockedAxios.post.mockRejectedValue(new Error('WA API error'));

      const promise = adapter.send(mockPayload);
      jest.advanceTimersByTime(5000);
      const result = await promise;

      expect(result.status).toBe('error');
      expect(result.attempts).toBe(3);
    });

    it('should NOT throw even after all retries exhausted', async () => {
      mockedAxios.post.mockRejectedValue(new Error('fatal'));
      const promise = adapter.send(mockPayload);
      jest.advanceTimersByTime(5000);
      await expect(promise).resolves.toMatchObject({ status: 'error', canal: 'whatsapp' });
    });
  });
  ```
- [ ] Confirmar RED: módulo `whatsapp.adapter` no existe → falla

---

### TASK-07 · [GREEN] Impl `WhatsAppAdapter` + backoff
**Estimación:** 25 min  
**Archivo:** `backend/worker/src/notifications/whatsapp.adapter.ts`

- [ ] Crear `WhatsAppAdapter` con:
  - Constructor: `(token: string, phoneNumberId: string, maxRetries = 3)`
  - `send(payload: NotifPayload): Promise<NotifResult>` — no lanza nunca
  - Usa `axios.post` a `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`
  - Header: `Authorization: Bearer ${token}`
  - Body: mensaje de texto con el contenido de `selectTemplate(payload.type).body` interpolado
  - Backoff idéntico al `EmailAdapter`: `min(1000 * 2^attempt, 30000)ms`
  - Retorna `NotifResult` con `canal: 'whatsapp'`
- [ ] Confirmar GREEN: `cd backend/worker && npx jest whatsapp.adapter` → 4 tests PASS

---

### TASK-08 · [RED] Tests `NotificationOrchestrator`
**Estimación:** 20 min  
**Archivo:** `backend/worker/src/__tests__/unit/notification.orchestrator.test.ts`

- [ ] Crear el test con mocks de adapters y `getNotifPreferences`:
  ```typescript
  import { NotificationOrchestrator } from '../../notifications/notification.orchestrator';
  import type { INotificationService, NotifPayload, NotifResult } from '../../notifications/notification.types';

  const mockPayload: NotifPayload = {
    eventId: 'evt-orch-01',
    type: 'malware',
    severity: 'high',
    sourceIp: '1.1.1.1',
    description: 'test',
    receivedAt: '2026-04-06T00:00:00Z',
    recipientEmail: 'admin@cyberguard.com',
    recipientPhone: '+573001234567',
  };

  const makeAdapter = (result: Partial<NotifResult>): INotificationService => ({
    send: jest.fn().mockResolvedValue({ attempts: 1, error: undefined, ...result }),
  });

  const makeFailAdapter = (canal: 'email' | 'whatsapp'): INotificationService => ({
    send: jest.fn().mockResolvedValue({ canal, status: 'error', attempts: 3, error: 'fail' }),
  });

  describe('NotificationOrchestrator', () => {
    it('should send via email only when emailEnabled=true, whatsappEnabled=false', async () => {
      const email = makeAdapter({ canal: 'email', status: 'success' });
      const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
      const orch = new NotificationOrchestrator(email, wa);
      const prefs = { emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' };
      const results = await orch.dispatch(mockPayload, prefs);
      expect(email.send).toHaveBeenCalledTimes(1);
      expect(wa.send).not.toHaveBeenCalled();
      expect(results).toHaveLength(1);
      expect(results[0].canal).toBe('email');
    });

    it('should send via whatsapp only when whatsappEnabled=true, emailEnabled=false', async () => {
      const email = makeAdapter({ canal: 'email', status: 'success' });
      const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
      const orch = new NotificationOrchestrator(email, wa);
      const prefs = { emailEnabled: false, whatsappEnabled: true, email: '', phone: '+573001234567' };
      const results = await orch.dispatch(mockPayload, prefs);
      expect(wa.send).toHaveBeenCalledTimes(1);
      expect(email.send).not.toHaveBeenCalled();
      expect(results[0].canal).toBe('whatsapp');
    });

    it('should send via both channels when both enabled', async () => {
      const email = makeAdapter({ canal: 'email', status: 'success' });
      const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
      const orch = new NotificationOrchestrator(email, wa);
      const prefs = { emailEnabled: true, whatsappEnabled: true, email: 'a@b.com', phone: '+1' };
      const results = await orch.dispatch(mockPayload, prefs);
      expect(results).toHaveLength(2);
    });

    it('should return empty array when both channels disabled', async () => {
      const email = makeAdapter({ canal: 'email', status: 'success' });
      const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
      const orch = new NotificationOrchestrator(email, wa);
      const prefs = { emailEnabled: false, whatsappEnabled: false, email: '', phone: '' };
      const results = await orch.dispatch(mockPayload, prefs);
      expect(results).toHaveLength(0);
      expect(email.send).not.toHaveBeenCalled();
      expect(wa.send).not.toHaveBeenCalled();
    });

    it('should still send whatsapp if email fails', async () => {
      const email = makeFailAdapter('email');
      const wa = makeAdapter({ canal: 'whatsapp', status: 'success' });
      const orch = new NotificationOrchestrator(email, wa);
      const prefs = { emailEnabled: true, whatsappEnabled: true, email: 'a@b.com', phone: '+1' };
      const results = await orch.dispatch(mockPayload, prefs);
      expect(results.find(r => r.canal === 'whatsapp')?.status).toBe('success');
    });

    it('should still send email if whatsapp fails', async () => {
      const email = makeAdapter({ canal: 'email', status: 'success' });
      const wa = makeFailAdapter('whatsapp');
      const orch = new NotificationOrchestrator(email, wa);
      const prefs = { emailEnabled: true, whatsappEnabled: true, email: 'a@b.com', phone: '+1' };
      const results = await orch.dispatch(mockPayload, prefs);
      expect(results.find(r => r.canal === 'email')?.status).toBe('success');
    });

    it('should NOT throw even if both channels fail', async () => {
      const email = makeFailAdapter('email');
      const wa = makeFailAdapter('whatsapp');
      const orch = new NotificationOrchestrator(email, wa);
      const prefs = { emailEnabled: true, whatsappEnabled: true, email: 'a@b.com', phone: '+1' };
      await expect(orch.dispatch(mockPayload, prefs)).resolves.toHaveLength(2);
    });
  });
  ```
- [ ] Confirmar RED: módulo `notification.orchestrator` no existe → falla

---

### TASK-09 · [GREEN] Impl `NotificationOrchestrator`
**Estimación:** 25 min  
**Archivo:** `backend/worker/src/notifications/notification.orchestrator.ts`

- [ ] Crear `NotificationOrchestrator`:
  ```typescript
  import type { INotificationService, NotifPayload, NotifResult } from './notification.types';
  import type { NotifPreferences } from '../redis';
  import { logger } from '../logger';

  export class NotificationOrchestrator {
    constructor(
      private readonly emailService: INotificationService,
      private readonly whatsappService: INotificationService,
    ) {}

    async dispatch(payload: NotifPayload, prefs: NotifPreferences): Promise<NotifResult[]> {
      const tasks: Promise<NotifResult>[] = [];

      if (prefs.emailEnabled && prefs.email) {
        tasks.push(
          this.emailService.send({ ...payload, recipientEmail: prefs.email }).catch((err: unknown) => ({
            canal: 'email' as const,
            status: 'error' as const,
            attempts: 0,
            error: err instanceof Error ? err.message : String(err),
          }))
        );
      }

      if (prefs.whatsappEnabled && prefs.phone) {
        tasks.push(
          this.whatsappService.send({ ...payload, recipientPhone: prefs.phone }).catch((err: unknown) => ({
            canal: 'whatsapp' as const,
            status: 'error' as const,
            attempts: 0,
            error: err instanceof Error ? err.message : String(err),
          }))
        );
      }

      if (tasks.length === 0) return [];

      const results = await Promise.allSettled(tasks);
      return results.map(r => (r.status === 'fulfilled' ? r.value : {
        canal: 'email' as const, status: 'error' as const, attempts: 0, error: 'Promise rejected'
      }));
    }
  }
  ```
  > **Nota:** Los adapters nunca lanzan (TASK-05/07), así que el `.catch()` del orquestador
  > es una capa de seguridad adicional. `Promise.allSettled` garantiza que ambos corran.
- [ ] Confirmar GREEN: `cd backend/worker && npx jest notification.orchestrator` → 7 tests PASS

---

### TASK-10 · [GREEN] Ampliar `redis.ts`, `config.ts` e `index.ts`
**Estimación:** 20 min

**`backend/worker/src/config.ts`** — añadir al final:
- [ ] Exportar 4 nuevas variables:
  ```typescript
  export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
  export const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@cyberguard.com';
  export const WA_TOKEN = process.env.WA_TOKEN || '';
  export const WA_PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID || '';
  ```

**`backend/worker/src/redis.ts`** — añadir las 2 funciones y el interface al final:
- [ ] Añadir `NotifPreferences` interface y `getNotifPreferences()`:
  ```typescript
  export interface NotifPreferences {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    email: string;
    phone: string;
  }

  export const getNotifPreferences = async (username: string): Promise<NotifPreferences | null> => {
    if (!redisClient?.isOpen) return null;
    try {
      const raw = await redisClient.get(`notif:prefs:${username}`);
      if (!raw) return null;
      return JSON.parse(raw) as NotifPreferences;
    } catch (err: unknown) {
      logger.error('Failed to get notif preferences', { error: (err as Error).message });
      return null;
    }
  };
  ```
- [ ] Añadir `saveNotifLog()`:
  ```typescript
  export const saveNotifLog = async (eventId: string, results: import('./notifications/notification.types').NotifResult[]): Promise<void> => {
    if (!redisClient?.isOpen) return;
    try {
      const key = `notif:log:${eventId}`;
      await redisClient.set(key, JSON.stringify({ eventId, results, savedAt: new Date().toISOString() }));
      await redisClient.expire(key, 604800); // 7 días
    } catch (err: unknown) {
      logger.error('Failed to save notif log', { error: (err as Error).message });
    }
  };
  ```

**`backend/worker/src/index.ts`** — añadir dispatch post-broadcast:
- [ ] Actualizar `main()` para crear el orquestador y disparar notificaciones externas:
  ```typescript
  // Añadir imports al inicio:
  import { NotificationOrchestrator } from './notifications/notification.orchestrator';
  import { EmailAdapter } from './notifications/email.adapter';
  import { WhatsAppAdapter } from './notifications/whatsapp.adapter';
  import { getNotifPreferences, saveNotifLog } from './redis';
  import { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, WA_TOKEN, WA_PHONE_NUMBER_ID } from './config';

  // En main(), después de crear el orchestrator y ANTES de connectAndConsume:
  const orchestrator = new NotificationOrchestrator(
    new EmailAdapter(SENDGRID_API_KEY, SENDGRID_FROM_EMAIL),
    new WhatsAppAdapter(WA_TOKEN, WA_PHONE_NUMBER_ID),
  );

  // Dentro del callback de connectAndConsume, DESPUÉS de broadcast(payload):
  //   void (async () => {
  //     const prefs = await getNotifPreferences('admin'); // TODO: extraer username del payload
  //     if (prefs) {
  //       const results = await orchestrator.dispatch({ ...payloadFields }, prefs);
  //       await saveNotifLog(payload.eventId ?? 'unknown', results);
  //     }
  //   })();
  ```
  > **⚠️ HUMAN CHECK:** El payload del Worker no incluye `username` del admin — solo datos de
  > la amenaza. Para MVP: usar `'admin'` hardcodeado como username (primer admin del sistema).
  > En iteración futura: enriquecer el mensaje RabbitMQ con `targetUsername` en el producer.

- [ ] Verificar suite Worker completa:
  ```bash
  cd backend/worker && npx jest --passWithNoTests
  ```

**Verificación:** `category-template` (7) + `email.adapter` (4) + `whatsapp.adapter` (4) + `notification.orchestrator` (7) = **≥ 22 tests PASS**.

---

## FASE 2 — Backend API: Preferencias de Notificación

### TASK-11 · Instalar Redis en Producer + crear `redis.ts`
**Estimación:** 15 min

- [ ] Instalar dependencia:
  ```bash
  cd backend/producer
  npm install redis
  ```
- [ ] Crear `backend/producer/src/infrastructure/config/redis.ts`:
  ```typescript
  import { createClient } from 'redis';
  import { logger } from './logger';

  let redisClient: ReturnType<typeof createClient> | null = null;

  export const connectRedis = async (): Promise<void> => {
    try {
      redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
      redisClient.on('error', (err: Error) => logger.error('Redis error (producer)', { error: err.message }));
      await redisClient.connect();
      logger.info('Redis connected (producer)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.warn('Redis connection failed (producer)', { error: message });
      redisClient = null;
    }
  };

  export const getRedisClient = () => redisClient;

  export const closeRedis = async (): Promise<void> => {
    if (redisClient?.isOpen) await redisClient.quit();
  };
  ```
- [ ] Añadir `connectRedis()` y `closeRedis()` en `server.ts` (en `startServer()` y SIGTERM handler)

---

### TASK-12 · [RED] Tests `GetNotificationPreferencesUseCase` (BE)
**Estimación:** 15 min  
**Archivo:** `backend/producer/src/__tests__/unit/GetNotificationPreferencesUseCase.test.ts`

- [ ] Crear test con mock del port:
  ```typescript
  import { GetNotificationPreferencesUseCase } from '../../application/use-cases/GetNotificationPreferencesUseCase';
  import type { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';
  import type { NotificationPreferences } from '../../domain/entities/NotificationPreferences';

  const DEFAULT: NotificationPreferences = {
    username: 'admin',
    emailEnabled: false,
    whatsappEnabled: false,
    email: '',
    phone: '',
  };

  const mockRepo: jest.Mocked<NotificationPreferencesRepository> = {
    getPreferences: jest.fn(),
    savePreferences: jest.fn(),
  };

  describe('GetNotificationPreferencesUseCase', () => {
    let useCase: GetNotificationPreferencesUseCase;

    beforeEach(() => {
      jest.clearAllMocks();
      useCase = new GetNotificationPreferencesUseCase(mockRepo);
    });

    it('should return stored preferences when they exist', async () => {
      const stored: NotificationPreferences = {
        username: 'admin',
        emailEnabled: true,
        whatsappEnabled: false,
        email: 'admin@example.com',
        phone: '',
      };
      mockRepo.getPreferences.mockResolvedValue(stored);
      const result = await useCase.execute({ username: 'admin' });
      expect(result).toEqual(stored);
      expect(mockRepo.getPreferences).toHaveBeenCalledWith('admin');
    });

    it('should return defaults when no preferences found', async () => {
      mockRepo.getPreferences.mockResolvedValue(null);
      const result = await useCase.execute({ username: 'admin' });
      expect(result).toEqual(DEFAULT);
    });
  });
  ```
- [ ] Confirmar RED: módulo no existe → falla

---

### TASK-13 · [GREEN] Entidad + port + `GetNotificationPreferencesUseCase`
**Estimación:** 20 min

- [ ] Crear `backend/producer/src/domain/entities/NotificationPreferences.ts`:
  ```typescript
  export interface NotificationPreferences {
    username: string;
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    email: string;
    phone: string;
  }

  export const DEFAULT_PREFERENCES = (username: string): NotificationPreferences => ({
    username,
    emailEnabled: false,
    whatsappEnabled: false,
    email: '',
    phone: '',
  });
  ```
- [ ] Crear `backend/producer/src/domain/ports/NotificationPreferencesRepository.ts`:
  ```typescript
  import type { NotificationPreferences } from '../entities/NotificationPreferences';

  export interface NotificationPreferencesRepository {
    getPreferences(username: string): Promise<NotificationPreferences | null>;
    savePreferences(prefs: NotificationPreferences): Promise<void>;
  }
  ```
- [ ] Crear `backend/producer/src/application/use-cases/GetNotificationPreferencesUseCase.ts`:
  ```typescript
  import type { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';
  import type { NotificationPreferences } from '../../domain/entities/NotificationPreferences';
  import { DEFAULT_PREFERENCES } from '../../domain/entities/NotificationPreferences';

  export class GetNotificationPreferencesUseCase {
    constructor(private readonly repo: NotificationPreferencesRepository) {}

    async execute({ username }: { username: string }): Promise<NotificationPreferences> {
      const prefs = await this.repo.getPreferences(username);
      return prefs ?? DEFAULT_PREFERENCES(username);
    }
  }
  ```
- [ ] Confirmar GREEN: `cd backend/producer && npx jest GetNotificationPreferences` → 2 tests PASS

---

### TASK-14 · [RED] Tests `SaveNotificationPreferencesUseCase` (BE)
**Estimación:** 15 min  
**Archivo:** `backend/producer/src/__tests__/unit/SaveNotificationPreferencesUseCase.test.ts`

- [ ] Crear test:
  ```typescript
  import { SaveNotificationPreferencesUseCase } from '../../application/use-cases/SaveNotificationPreferencesUseCase';
  import type { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';

  const mockRepo: jest.Mocked<NotificationPreferencesRepository> = {
    getPreferences: jest.fn(),
    savePreferences: jest.fn().mockResolvedValue(undefined),
  };

  describe('SaveNotificationPreferencesUseCase', () => {
    let useCase: SaveNotificationPreferencesUseCase;

    beforeEach(() => {
      jest.clearAllMocks();
      useCase = new SaveNotificationPreferencesUseCase(mockRepo);
    });

    it('should call savePreferences with the provided data', async () => {
      const prefs = { username: 'admin', emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' };
      await useCase.execute(prefs);
      expect(mockRepo.savePreferences).toHaveBeenCalledWith(prefs);
    });

    it('should propagate errors from the repository', async () => {
      mockRepo.savePreferences.mockRejectedValueOnce(new Error('Redis down'));
      await expect(
        useCase.execute({ username: 'admin', emailEnabled: false, whatsappEnabled: false, email: '', phone: '' })
      ).rejects.toThrow('Redis down');
    });
  });
  ```
- [ ] Confirmar RED: módulo no existe → falla

---

### TASK-15 · [GREEN] `RedisNotificationPreferencesRepository` + `SaveNotificationPreferencesUseCase`
**Estimación:** 20 min

- [ ] Crear `backend/producer/src/infrastructure/persistence/RedisNotificationPreferencesRepository.ts`:
  ```typescript
  import type { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';
  import type { NotificationPreferences } from '../../domain/entities/NotificationPreferences';
  import { getRedisClient } from '../config/redis';
  import { logger } from '../config/logger';

  export class RedisNotificationPreferencesRepository implements NotificationPreferencesRepository {
    private key(username: string) { return `notif:prefs:${username}`; }

    async getPreferences(username: string): Promise<NotificationPreferences | null> {
      const client = getRedisClient();
      if (!client?.isOpen) return null;
      try {
        const raw = await client.get(this.key(username));
        return raw ? (JSON.parse(raw) as NotificationPreferences) : null;
      } catch (err: unknown) {
        logger.error('RedisNotifPrefsRepo: getPreferences failed', { error: (err as Error).message });
        return null;
      }
    }

    async savePreferences(prefs: NotificationPreferences): Promise<void> {
      const client = getRedisClient();
      if (!client?.isOpen) throw new Error('Redis not available');
      await client.set(this.key(prefs.username), JSON.stringify(prefs));
    }
  }
  ```
- [ ] Crear `backend/producer/src/application/use-cases/SaveNotificationPreferencesUseCase.ts`:
  ```typescript
  import type { NotificationPreferencesRepository } from '../../domain/ports/NotificationPreferencesRepository';
  import type { NotificationPreferences } from '../../domain/entities/NotificationPreferences';

  export class SaveNotificationPreferencesUseCase {
    constructor(private readonly repo: NotificationPreferencesRepository) {}

    async execute(prefs: NotificationPreferences): Promise<void> {
      await this.repo.savePreferences(prefs);
    }
  }
  ```
- [ ] Confirmar GREEN: `cd backend/producer && npx jest SaveNotificationPreferences` → 2 tests PASS

---

### TASK-16 · [RED] Tests `profile-notifications.controller`
**Estimación:** 20 min  
**Archivo:** `backend/producer/src/__tests__/unit/profile-notifications.controller.test.ts`

- [ ] Crear test con `supertest` y mocks de `ServiceFactory`:
  ```typescript
  import request from 'supertest';
  import express from 'express';
  import { profileNotificationsRouter } from '../../infrastructure/http/controllers/profile-notifications.controller';
  import { ServiceFactory } from '../../infrastructure/factories/ServiceFactory';

  jest.mock('../../infrastructure/factories/ServiceFactory');
  jest.mock('../../infrastructure/http/middlewares/auth.middleware', () => ({
    authMiddleware: (req: any, _res: any, next: any) => {
      req.user = { username: 'admin', role: 'admin' };
      next();
    },
  }));

  const app = express();
  app.use(express.json());
  app.use('/api/profile/notification-preferences', profileNotificationsRouter);

  const mockGetUseCase = { execute: jest.fn() };
  const mockSaveUseCase = { execute: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (ServiceFactory.getGetNotifPrefsUseCase as jest.Mock).mockReturnValue(mockGetUseCase);
    (ServiceFactory.getSaveNotifPrefsUseCase as jest.Mock).mockReturnValue(mockSaveUseCase);
  });

  describe('GET /api/profile/notification-preferences', () => {
    it('should return 200 with preferences', async () => {
      const prefs = { username: 'admin', emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' };
      mockGetUseCase.execute.mockResolvedValue(prefs);
      const res = await request(app).get('/api/profile/notification-preferences');
      expect(res.status).toBe(200);
      expect(res.body.emailEnabled).toBe(true);
    });
  });

  describe('PUT /api/profile/notification-preferences', () => {
    it('should return 200 on valid body', async () => {
      mockSaveUseCase.execute.mockResolvedValue(undefined);
      const res = await request(app)
        .put('/api/profile/notification-preferences')
        .send({ emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' });
      expect(res.status).toBe(200);
    });

    it('should return 400 when email required but missing', async () => {
      const res = await request(app)
        .put('/api/profile/notification-preferences')
        .send({ emailEnabled: true, whatsappEnabled: false, email: '', phone: '' });
      expect(res.status).toBe(400);
    });

    it('should return 400 when phone required but invalid format', async () => {
      const res = await request(app)
        .put('/api/profile/notification-preferences')
        .send({ emailEnabled: false, whatsappEnabled: true, email: '', phone: 'no-phone' });
      expect(res.status).toBe(400);
    });
  });
  ```
- [ ] Confirmar RED: módulo no existe → falla

---

### TASK-17 · [GREEN] Impl controller + Joi schema + wiring ServiceFactory + server.ts
**Estimación:** 25 min

- [ ] Crear `backend/producer/src/infrastructure/http/validators/saveNotifPreferences.schema.ts`:
  ```typescript
  import Joi from 'joi';

  export const saveNotifPreferencesSchema = Joi.object({
    emailEnabled: Joi.boolean().required(),
    whatsappEnabled: Joi.boolean().required(),
    email: Joi.when('emailEnabled', {
      is: true,
      then: Joi.string().email().required().messages({ 'string.empty': 'Email requerido cuando la notificación está activa' }),
      otherwise: Joi.string().allow('').default(''),
    }),
    phone: Joi.when('whatsappEnabled', {
      is: true,
      then: Joi.string().pattern(/^\+[1-9]\d{9,14}$/).required().messages({ 'string.pattern.base': 'Número de teléfono debe tener formato E.164 (ej: +573001234567)' }),
      otherwise: Joi.string().allow('').default(''),
    }),
  });
  ```

- [ ] Crear `backend/producer/src/infrastructure/http/controllers/profile-notifications.controller.ts`:
  ```typescript
  import { Router, Response } from 'express';
  import { authMiddleware, AuthRequest } from '../middlewares/auth.middleware';
  import { ServiceFactory } from '../../factories/ServiceFactory';
  import { saveNotifPreferencesSchema } from '../validators/saveNotifPreferences.schema';
  import { logger } from '../../config/logger';

  export const profileNotificationsRouter = Router();

  profileNotificationsRouter.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const username = req.user!.username;
    try {
      const useCase = ServiceFactory.getGetNotifPrefsUseCase();
      const prefs = await useCase.execute({ username });
      res.status(200).json(prefs);
    } catch (err: unknown) {
      logger.error('GetNotifPrefs error', { error: (err as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  profileNotificationsRouter.put('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    const { error, value } = saveNotifPreferencesSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.details[0]?.message ?? 'Validation error' });
      return;
    }
    const username = req.user!.username;
    try {
      const useCase = ServiceFactory.getSaveNotifPrefsUseCase();
      await useCase.execute({ username, ...value });
      res.status(200).json({ message: 'Notification preferences updated successfully' });
    } catch (err: unknown) {
      logger.error('SaveNotifPrefs error', { error: (err as Error).message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  ```

- [ ] Añadir métodos en `ServiceFactory.ts`:
  ```typescript
  static getNotifPrefsRepository(): NotificationPreferencesRepository { ... }
  static getGetNotifPrefsUseCase(): GetNotificationPreferencesUseCase { ... }
  static getSaveNotifPrefsUseCase(): SaveNotificationPreferencesUseCase { ... }
  ```
- [ ] Añadir en `server.ts`:
  ```typescript
  import { profileNotificationsRouter } from './infrastructure/http/controllers/profile-notifications.controller';
  // ...
  app.use('/api/profile/notification-preferences', profileNotificationsRouter);
  ```
- [ ] Confirmar GREEN: `cd backend/producer && npx jest profile-notifications` → 4 tests PASS

---

## FASE 3 — Frontend: Formulario de Preferencias

### TASK-18 · [RED] Tests use cases Frontend
**Estimación:** 15 min  
**Archivos:** `src/core/application/use-cases/__tests__/`

- [ ] Crear `get-notification-preferences.use-case.spec.ts`:
  ```typescript
  import { TestBed } from '@angular/core/testing';
  import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
  import { GetNotificationPreferencesUseCase } from '../get-notification-preferences.use-case';
  import { NotificationPreferencesRepository } from '../../../domain/ports/notification-preferences.repository';
  import { of } from 'rxjs';
  import { DEFAULT_PREFERENCES } from '../../../domain/models/notification-preferences.model';

  beforeAll(() => TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting()));

  describe('GetNotificationPreferencesUseCase', () => {
    it('should delegate to repository.get()', (done) => {
      const mockRepo = { get: jest.fn().mockReturnValue(of({ ...DEFAULT_PREFERENCES, emailEnabled: true })), save: jest.fn() };
      TestBed.configureTestingModule({ providers: [{ provide: NotificationPreferencesRepository, useValue: mockRepo }] });
      const useCase = TestBed.inject(GetNotificationPreferencesUseCase);
      useCase.execute().subscribe(prefs => {
        expect(prefs.emailEnabled).toBe(true);
        expect(mockRepo.get).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });
  ```
- [ ] Confirmar RED: módulos no existen → falla

---

### TASK-19 · [GREEN] Model + port + HTTP impl + use cases Frontend
**Estimación:** 25 min  
**Directorio base:** `frontend/cyberguard-system-appv2/src/`

- [ ] Crear `core/domain/models/notification-preferences.model.ts`:
  ```typescript
  export interface NotificationPreferences {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    email: string;
    phone: string;
  }

  export const DEFAULT_PREFERENCES: NotificationPreferences = {
    emailEnabled: false, whatsappEnabled: false, email: '', phone: '',
  };
  ```
- [ ] Crear `core/domain/ports/notification-preferences.repository.ts`:
  ```typescript
  import { Observable } from 'rxjs';
  import { NotificationPreferences } from '../models/notification-preferences.model';

  export abstract class NotificationPreferencesRepository {
    abstract get(): Observable<NotificationPreferences>;
    abstract save(prefs: NotificationPreferences): Observable<void>;
  }
  ```
- [ ] Crear `core/infrastructure/services/notification-preferences-repository.impl.ts`:
  ```typescript
  import { inject, Injectable } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { map, Observable } from 'rxjs';
  import { NotificationPreferencesRepository } from '../../domain/ports/notification-preferences.repository';
  import { NotificationPreferences } from '../../domain/models/notification-preferences.model';
  import { environment } from '@environments/environment';

  @Injectable({ providedIn: 'root' })
  export class NotificationPreferencesRepositoryImpl extends NotificationPreferencesRepository {
    private readonly http = inject(HttpClient);
    private readonly URL = `${environment.apiUrl}/api/profile/notification-preferences`;

    get(): Observable<NotificationPreferences> {
      return this.http.get<NotificationPreferences>(this.URL);
    }

    save(prefs: NotificationPreferences): Observable<void> {
      return this.http.put<void>(this.URL, prefs);
    }
  }
  ```
- [ ] Crear `core/application/use-cases/get-notification-preferences.use-case.ts`:
  ```typescript
  import { inject, Injectable } from '@angular/core';
  import { Observable } from 'rxjs';
  import { NotificationPreferencesRepository } from '../../domain/ports/notification-preferences.repository';
  import { NotificationPreferences } from '../../domain/models/notification-preferences.model';

  @Injectable({ providedIn: 'root' })
  export class GetNotificationPreferencesUseCase {
    private readonly repo = inject(NotificationPreferencesRepository);
    execute(): Observable<NotificationPreferences> { return this.repo.get(); }
  }
  ```
- [ ] Crear `core/application/use-cases/save-notification-preferences.use-case.ts`:
  ```typescript
  import { inject, Injectable } from '@angular/core';
  import { Observable } from 'rxjs';
  import { NotificationPreferencesRepository } from '../../domain/ports/notification-preferences.repository';
  import { NotificationPreferences } from '../../domain/models/notification-preferences.model';

  @Injectable({ providedIn: 'root' })
  export class SaveNotificationPreferencesUseCase {
    private readonly repo = inject(NotificationPreferencesRepository);
    execute(prefs: NotificationPreferences): Observable<void> { return this.repo.save(prefs); }
  }
  ```
- [ ] Confirmar GREEN: `cd frontend/cyberguard-system-appv2 && npx vitest run notification-preferences.use-case` → tests PASS

---

### TASK-20 · [RED] Tests `NotificationPreferencesComponent`
**Estimación:** 20 min  
**Archivo:** `src/presentation/components/notification-preferences/__tests__/notification-preferences.component.spec.ts`

- [ ] Crear tests (mocks del use case + reactive form):
  ```typescript
  import { TestBed } from '@angular/core/testing';
  import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
  import { NotificationPreferencesComponent } from '../notification-preferences.component';
  import { GetNotificationPreferencesUseCase } from '../../../../core/application/use-cases/get-notification-preferences.use-case';
  import { SaveNotificationPreferencesUseCase } from '../../../../core/application/use-cases/save-notification-preferences.use-case';
  import { of, throwError } from 'rxjs';
  import { DEFAULT_PREFERENCES } from '../../../../core/domain/models/notification-preferences.model';

  beforeAll(() => TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting()));

  describe('NotificationPreferencesComponent', () => {
    const mockGet = { execute: jest.fn() };
    const mockSave = { execute: jest.fn() };

    beforeEach(() => {
      TestBed.resetTestingModule();
      jest.clearAllMocks();
      mockGet.execute.mockReturnValue(of({ ...DEFAULT_PREFERENCES }));
      TestBed.configureTestingModule({
        imports: [NotificationPreferencesComponent],
        providers: [
          { provide: GetNotificationPreferencesUseCase, useValue: mockGet },
          { provide: SaveNotificationPreferencesUseCase, useValue: mockSave },
        ]
      });
    });

    it('should create', () => {
      const fixture = TestBed.createComponent(NotificationPreferencesComponent);
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should load preferences on init', () => {
      mockGet.execute.mockReturnValue(of({ emailEnabled: true, whatsappEnabled: false, email: 'a@b.com', phone: '' }));
      const fixture = TestBed.createComponent(NotificationPreferencesComponent);
      fixture.detectChanges();
      expect(fixture.componentInstance.form.get('emailEnabled')?.value).toBe(true);
    });

    it('should disable email field when emailEnabled is false', () => {
      const fixture = TestBed.createComponent(NotificationPreferencesComponent);
      fixture.detectChanges();
      const emailCtrl = fixture.componentInstance.form.get('email');
      expect(emailCtrl?.disabled).toBe(true);
    });

    it('should enable email field when emailEnabled is toggled to true', () => {
      const fixture = TestBed.createComponent(NotificationPreferencesComponent);
      fixture.detectChanges();
      fixture.componentInstance.form.get('emailEnabled')?.setValue(true);
      const emailCtrl = fixture.componentInstance.form.get('email');
      expect(emailCtrl?.enabled).toBe(true);
    });

    it('should call SaveUseCase on valid form submit', () => {
      mockSave.execute.mockReturnValue(of(undefined));
      const fixture = TestBed.createComponent(NotificationPreferencesComponent);
      fixture.detectChanges();
      fixture.componentInstance.form.setValue({ emailEnabled: false, email: '', whatsappEnabled: false, phone: '' });
      fixture.componentInstance.save();
      expect(mockSave.execute).toHaveBeenCalledTimes(1);
    });

    it('should show success message after saving', () => {
      mockSave.execute.mockReturnValue(of(undefined));
      const fixture = TestBed.createComponent(NotificationPreferencesComponent);
      fixture.detectChanges();
      fixture.componentInstance.form.setValue({ emailEnabled: false, email: '', whatsappEnabled: false, phone: '' });
      fixture.componentInstance.save();
      expect(fixture.componentInstance.saveSuccess).toBe(true);
    });
  });
  ```
- [ ] Confirmar RED: componente no existe → falla

---

### TASK-21 · [GREEN] Impl `NotificationPreferencesComponent`
**Estimación:** 30 min  
**Directorio:** `src/presentation/components/notification-preferences/`

- [ ] Crear `notification-preferences.component.ts`:
  - `@Component({ standalone: true, selector: 'app-notification-preferences', ... })`
  - `ReactiveFormsModule` importado
  - `form = new FormGroup(...)` con `emailEnabled`, `email`, `whatsappEnabled`, `phone`
  - En `ngOnInit()`: subscribir a `GetNotificationPreferencesUseCase.execute()` y parchear el form
  - Lógica de enable/disable: subscribir a `emailEnabled.valueChanges` y `whatsappEnabled.valueChanges`
  - Método `save()`: llama a `SaveNotificationPreferencesUseCase.execute({...form.getRawValue()})`
  - `saveSuccess = false` → `true` tras éxito, reset a `false` en error
  - `savingError: string | null = null`
  - Campos `email`/`phone` inician **disabled** y se habilitan según toggle

- [ ] Crear `notification-preferences.component.html`:
  - Dos secciones: Email y WhatsApp
  - `<input type="checkbox">` para toggles (bind con `formControlName`)
  - `<input type="email">` y `<input type="tel">` para los datos de contacto
  - `<button [disabled]="form.invalid || saving">Guardar</button>`
  - `@if (saveSuccess)` → mensaje verde "Preferencias guardadas"
  - `@if (savingError)` → mensaje rojo con el error

- [ ] Crear `notification-preferences.component.css`:
  - Estilos de sección, toggle, botón disabled, mensajes de feedback

- [ ] Confirmar GREEN: `npx vitest run notification-preferences.component` → ≥ 6 tests PASS

---

### TASK-22 · [GREEN] Wiring en `app.config.ts` + Dashboard
**Estimación:** 10 min

- [ ] Añadir provider en `app/app.config.ts`:
  ```typescript
  import { NotificationPreferencesRepository } from '../core/domain/ports/notification-preferences.repository';
  import { NotificationPreferencesRepositoryImpl } from '../core/infrastructure/services/notification-preferences-repository.impl';
  // ...
  { provide: NotificationPreferencesRepository, useClass: NotificationPreferencesRepositoryImpl },
  ```
- [ ] Añadir componente en `presentation/components/dashboard/dashboard.component.ts`:
  ```typescript
  // En imports del componente:
  import { NotificationPreferencesComponent } from '../notification-preferences/notification-preferences.component';
  // En template (solo si es admin):
  // @if (isAdmin()) { <app-notification-preferences /> }
  ```
- [ ] Verificar compilación TypeScript: `cd frontend/cyberguard-system-appv2 && npx tsc --noEmit`

---

## FASE 4 — Verificación Final

### TASK-23 · Suite completa
**Estimación:** 10 min

- [ ] Worker: `cd backend/worker && npx jest --passWithNoTests`
  - Confirmar ≥ 22 tests PASS: category-template (7) + email.adapter (4) + whatsapp.adapter (4) + notification.orchestrator (7)
- [ ] Backend: `cd backend/producer && npx jest --passWithNoTests`
  - Confirmar ≥ 8 tests PASS: GetNotifPrefs (2) + SaveNotifPrefs (2) + controller (4)
- [ ] Frontend: `cd frontend/cyberguard-system-appv2 && npx vitest run`
  - Confirmar ≥ 9 tests PASS en nuevos modules: use-cases (2) + component (6) + save-use-case (1)
- [ ] Commit:
  ```bash
  git add -A
  git commit -m "feat(external-notifications): email+WA adapters, orchestrator, API prefs, formulario Angular

  Worker: CategoryTemplateStrategy, EmailAdapter (SendGrid), WhatsAppAdapter (WA API), NotificationOrchestrator
  Backend: GetNotifPrefsUseCase, SaveNotifPrefsUseCase, RedisNotifPrefsRepository, profileNotificationsRouter
  Frontend: NotificationPreferencesComponent + use cases + HTTP repository
  Tests: ~39 nuevos tests (Worker 22 + Backend 8 + Frontend 9)"
  ```

---

## Árbol de Ramas

```
feature/ep-02/real-time-notifications  (base)
└── feature/ep-03/external-notifications  ← rama única de trabajo
```
