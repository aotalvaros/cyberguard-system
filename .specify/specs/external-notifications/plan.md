# Plan: External Notifications
**Feature ID:** `external-notifications`
**Spec:** `.specify/specs/external-notifications/spec.md`
**Versión:** 1.0.0
**Fecha:** 06 Abr 2026
**Rama base:** `feature/ep-02/real-time-notifications`
**Rama de trabajo:** `feature/ep-03/external-notifications`

---

## 1. Estado Actual — Arqueología de Código

### ✅ YA IMPLEMENTADO (no tocar)

#### Worker (`backend/worker/src/`)

| Archivo | Estado | Relevancia |
|---------|--------|-----------|
| `index.ts` | ✅ Existente | Punto de entrada; wires RabbitMQ → `handleMessage` → `saveToRedis` → `broadcast`. **Modificar** para añadir dispatch tras `broadcast`. |
| `rabbitmq.ts` | ✅ Existente | Consumer con ACK manual post-proceso. No tocar. |
| `redis.ts` | ✅ Existente | `saveToRedis`, `getHistoryFromRedis`, `clearHistoryFromRedis`, `removeHistoryItemById`. **Ampliar** con `getNotifPreferences()` y `saveNotifLog()`. |
| `handler.ts` | ✅ Existente | `buildPayload`, `handleMessage`, sanitización XSS. No tocar. |
| `websocket.ts` | ✅ Existente | `startWebSocket`, `broadcast`, `closeWebSocket`. No tocar. |
| `config.ts` | ✅ Existente | `RABBITMQ_URL`, `REDIS_URL`, `WS_PORT`, `EXCHANGE`, `TOPIC`. **Ampliar** con secrets de email/WA. |
| `logger.ts` | ✅ Existente | Winston logger. No tocar. |

#### Backend Producer (`backend/producer/src/`)

| Archivo | Estado | Relevancia |
|---------|--------|-----------|
| `server.ts` | ✅ Existente | Express app, rutas `/api/auth`, `/api/threats`, `/api/admin`, `/api/statistics`. **Ampliar** con `/api/profile/notification-preferences`. |
| `ServiceFactory.ts` | ✅ Existente | Singleton factory para todos los use cases + repositories. **Ampliar** con nuevos componentes de notificación. |
| `admin.controller.ts` | ✅ Patrón de referencia | `authMiddleware` + Joi + `ServiceFactory`. Copiar patrón. |
| `auth.middleware.ts` | ✅ Existente | Valida JWT y expone `req.user.username` + `req.user.role`. No tocar. |

#### Frontend (`frontend/cyberguard-system-appv2/src/`)

| Archivo | Estado | Relevancia |
|---------|--------|-----------|
| `app.config.ts` | ✅ Existente | `provide: Port, useClass: Impl`. **Ampliar** con nuevo provider. |
| `statistics-repository.impl.ts` | ✅ Patrón de referencia | `inject(HttpClient)`, `extends StatisticsRepository`, `pipe(map, catchError)`. Copiar patrón. |
| `get-statistics.use-case.ts` | ✅ Patrón de referencia | `@Injectable`, `inject(Repository)`, `execute()`. Copiar patrón. |
| `auth.interceptor.ts` | ✅ Existente | Añade `Authorization: Bearer <token>` automáticamente. No tocar. |
| `loading.service.ts` | ✅ Existente | `LoadingService`, `isLoading` signal. Usar en componente. |
| `dashboard.component.ts` | ✅ Existente | Punto de integración del nuevo componente de preferencias. |

---

## 2. Árbol de Archivos Nuevos

```
backend/worker/src/
├── notifications/
│   ├── notification.types.ts               ← NotifPayload, NotifResult, INotificationService
│   ├── category-template.strategy.ts       ← templates por threat.type
│   ├── email.adapter.ts                    ← SendGrid SDK + exponential backoff
│   ├── whatsapp.adapter.ts                 ← WA Business API (HTTP) + backoff
│   └── notification.orchestrator.ts        ← orquesta canales, tolerancia a fallos
└── (modificar)
    ├── config.ts                           ← SENDGRID_API_KEY, WA_TOKEN, WA_PHONE_NUMBER_ID
    ├── redis.ts                            ← getNotifPreferences(), saveNotifLog()
    └── index.ts                            ← dispatch tras broadcast

backend/producer/src/
├── domain/
│   ├── entities/NotificationPreferences.ts ← entidad de dominio
│   └── ports/NotificationPreferencesRepository.ts
├── application/use-cases/
│   ├── GetNotificationPreferencesUseCase.ts
│   └── SaveNotificationPreferencesUseCase.ts
└── infrastructure/
    ├── persistence/
    │   └── RedisNotificationPreferencesRepository.ts
    └── http/
        ├── controllers/
        │   └── profile-notifications.controller.ts
        └── validators/
            └── saveNotifPreferences.schema.ts
(modificar)
    ├── factories/ServiceFactory.ts
    └── server.ts

frontend/cyberguard-system-appv2/src/
├── core/domain/
│   ├── models/notification-preferences.model.ts
│   └── ports/notification-preferences.repository.ts
├── core/application/use-cases/
│   ├── get-notification-preferences.use-case.ts
│   └── save-notification-preferences.use-case.ts
├── core/infrastructure/services/
│   └── notification-preferences-repository.impl.ts
└── presentation/components/
    └── notification-preferences/
        ├── notification-preferences.component.ts
        ├── notification-preferences.component.html
        └── notification-preferences.component.css
(modificar)
    ├── app/app.config.ts
    └── presentation/components/dashboard/dashboard.component.ts
```

---

## 3. Orden de Implementación (TDD por Fase)

El orden respeta las dependencias: **Worker** (más independiente) →
**Backend API** (depende solo de Redis) → **Frontend** (depende de la API).

```
FASE 1: Worker — Notificaciones externas
  STEP 01 · [RED]   Tests CategoryTemplateStrategy
  STEP 02 · [GREEN] Impl CategoryTemplateStrategy
  STEP 03 · [RED]   Tests EmailAdapter (mock SendGrid)
  STEP 04 · [GREEN] Impl EmailAdapter + backoff exponencial
  STEP 05 · [RED]   Tests WhatsAppAdapter (mock HTTP)
  STEP 06 · [GREEN] Impl WhatsAppAdapter + backoff exponencial
  STEP 07 · [RED]   Tests NotificationOrchestrator (tolerancia fallos)
  STEP 08 · [GREEN] Impl NotificationOrchestrator
  STEP 09 · [GREEN] Ampliar redis.ts (getNotifPreferences + saveNotifLog)
  STEP 10 · [GREEN] Ampliar config.ts (env vars nuevas)
  STEP 11 · [GREEN] Actualizar index.ts (dispatch post-broadcast)

FASE 2: Backend API — Preferencias de notificación
  STEP 12 · [RED]   Tests GetNotificationPreferencesUseCase
  STEP 13 · [GREEN] Entidad NotificationPreferences + port + use cases
  STEP 14 · [RED]   Tests SaveNotificationPreferencesUseCase
  STEP 15 · [GREEN] RedisNotificationPreferencesRepository
  STEP 16 · [RED]   Tests profile-notifications.controller
  STEP 17 · [GREEN] Impl controller + Joi schema
  STEP 18 · [GREEN] Registrar en ServiceFactory + server.ts

FASE 3: Frontend — Formulario de preferencias
  STEP 19 · [RED]   Tests GetNotificationPreferencesUseCase (FE)
  STEP 20 · [GREEN] Model + port + HTTP impl + use cases (FE)
  STEP 21 · [RED]   Tests SaveNotificationPreferencesUseCase (FE)
  STEP 22 · [RED]   Tests NotificationPreferencesComponent
  STEP 23 · [GREEN] Impl NotificationPreferencesComponent (ts + html + css)
  STEP 24 · [GREEN] Registrar provider + integrar en Dashboard
```

---

## 4. Contratos Internos

### Worker — `notification.types.ts`

```typescript
export interface NotifPayload {
  eventId: string;
  type: string;        // malware | phishing | ddos | intrusion | other
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

### Worker — `notification.orchestrator.ts`

```typescript
// Flujo por mensaje:
// 1. getNotifPreferences(username) ← Redis key: notif:prefs:{username}
// 2. if emailEnabled    → EmailAdapter.send()    (no-throw, captura error)
// 3. if whatsappEnabled → WhatsAppAdapter.send() (no-throw, captura error)
// 4. saveNotifLog(eventId, results[])            ← Redis key: notif:log:{eventId}
// NUNCA lanza — todos los errores son capturados y logueados
```

### Worker — `category-template.strategy.ts`

```typescript
export interface NotifTemplate {
  subject: string;  // para email
  body: string;     // texto del mensaje (email y WhatsApp)
}

const TEMPLATES: Record<string, NotifTemplate> = {
  malware:   { subject: '🚨 Alerta: Malware Detectado',   body: '...' },
  phishing:  { subject: '⚠️ Alerta: Phishing Detectado',  body: '...' },
  ddos:      { subject: '🔥 Alerta: Ataque DDoS',          body: '...' },
  intrusion: { subject: '🛑 Alerta: Intrusión Detectada',  body: '...' },
  other:     { subject: '⚡ Alerta de Seguridad',          body: '...' },
};

export const selectTemplate = (type: string): NotifTemplate =>
  TEMPLATES[type] ?? TEMPLATES['other'];
```

### Worker — `redis.ts` (ampliaciones)

```typescript
// Clave para preferencias: notif:prefs:{username}
// Clave para log:          notif:log:{eventId}   TTL: 7 días (604800s)

export interface NotifPreferences {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}

export const getNotifPreferences = async (username: string): Promise<NotifPreferences | null>
export const saveNotifLog = async (eventId: string, results: NotifResult[]): Promise<void>
```

### Backend API — `NotificationPreferences` (entidad)

```typescript
export interface NotificationPreferences {
  username: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}
```

### Backend API — `RedisNotificationPreferencesRepository`

```typescript
// Redis key: notif:prefs:{username}
// Sin TTL (persistente mientras el usuario no lo cambie)
// getPreferences(username): NotificationPreferences | null
// savePreferences(prefs: NotificationPreferences): void
```

### Frontend — `notification-preferences.model.ts`

```typescript
export interface NotificationPreferences {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  email: string;
  phone: string;
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailEnabled: false,
  whatsappEnabled: false,
  email: '',
  phone: '',
};
```

### Frontend — `NotificationPreferencesRepository` (port)

```typescript
export abstract class NotificationPreferencesRepository {
  abstract get(): Observable<NotificationPreferences>;
  abstract save(prefs: NotificationPreferences): Observable<void>;
}
```

---

## 5. Dependencias nuevas a instalar

### Worker

```bash
cd backend/worker
npm install @sendgrid/mail axios
npm install -D @types/node
```

### Backend Producer

```bash
cd backend/producer
# ⚠️ El producer NO tiene Redis — necesita instalarse
npm install redis
npm install -D @types/node
```

> **Decisión:** Crear `src/infrastructure/config/redis.ts` en el producer
> siguiendo el mismo patrón que `backend/worker/src/redis.ts` (singleton client,
> `connectRedis()` / `closeRedis()`). El cliente se inicializa en `startServer()`.

### Frontend

```bash
# No se requieren nuevas dependencias — uses HttpClient ya configurado
```

---

## 6. Variable de Entorno — `docker-compose.yml`

```yaml
# worker service — añadir:
environment:
  SENDGRID_API_KEY: ${SENDGRID_API_KEY:-}
  WA_TOKEN: ${WA_TOKEN:-}
  WA_PHONE_NUMBER_ID: ${WA_PHONE_NUMBER_ID:-}
  SENDGRID_FROM_EMAIL: ${SENDGRID_FROM_EMAIL:-noreply@cyberguard.com}
```

> **Nota:** Al usar `:-` (valor vacío como default), el worker arranca en modo
> "notificaciones desactivadas" si las vars no están definidas, sin fallar.

---

## 7. Decisiones de Diseño

| Decisión | Opción elegida | Justificación |
|----------|---------------|---------------|
| HTTP client en Worker | `axios` | Ya presente en ecosistema Node.js del proyecto; no requiere polyfills. |
| Email SDK | `@sendgrid/mail` | SDK oficial, simple, TypeScript-first. Referenciado en DECISION_LOG.md. |
| Independencia de canales | Try/catch por canal en `NotificationOrchestrator` | Cada canal falla de forma aislada; el error de uno NO interrumpe el otro. |
| Preferencias en Redis | `notif:prefs:{username}` (JSON stringified) | Consistente con el patrón existente en `redis.ts`. Sin TTL — dato estable. |
| Log de notificaciones | `notif:log:{eventId}` (TTL 7 días) | Trazabilidad sin crecer indefinidamente. |
| Dispatch asíncrono | `Promise.allSettled()` en orquestador | Espera ambos canales pero no falla por ninguno. |
| No bloquear ACK | Dispatch DESPUÉS de `broadcast()` + `void` (fire-and-forget con catch) | El ACK ya ocurrio antes del dispatch (por diseño de `rabbitmq.ts`). |
| Redis en Producer | Añadir `redis` como dep + crear `infrastructure/config/redis.ts` | El producer actualmente **solo usa Postgres + RabbitMQ** (sin Redis). Necesita un cliente Redis para leer/escribir `notif:prefs:{username}`. |

---

## 8. Mapa de Tests por Step

| Step | Archivo de test | Tests mínimos esperados |
|------|----------------|------------------------|
| STEP 01 | `__tests__/unit/category-template.strategy.test.ts` | 5 tipos + fallback 'other', case-insensitive |
| STEP 03 | `__tests__/unit/email.adapter.test.ts` | éxito, fallo 1 intento, fallo 3 reintentos, backoff delays |
| STEP 05 | `__tests__/unit/whatsapp.adapter.test.ts` | éxito, fallo 1 intento, fallo 3 reintentos |
| STEP 07 | `__tests__/unit/notification.orchestrator.test.ts` | sólo email, sólo WA, ambos, ninguno, fallo email→WA OK, fallo WA→email OK |
| STEP 12 | `__tests__/unit/GetNotificationPreferencesUseCase.test.ts` | prefs existentes, prefs no encontradas → defaults |
| STEP 14 | `__tests__/unit/SaveNotificationPreferencesUseCase.test.ts` | guardar, validación username |
| STEP 16 | `__tests__/unit/profile-notifications.controller.test.ts` | GET 200, GET 401, PUT 200, PUT 400 (Joi), PUT 401 |
| STEP 19 | FE: `get-notification-preferences.use-case.spec.ts` | delegación al port, mapping defaults |
| STEP 21 | FE: `save-notification-preferences.use-case.spec.ts` | delegación al port |
| STEP 22 | FE: `notification-preferences.component.spec.ts` | carga prefs, toggle email habilita campo, guardar exitoso, errores inline |

---

## 9. Puntos de Integración con Código Existente

| Archivo existente | Cambio mínimo necesario |
|------------------|------------------------|
| `backend/worker/src/index.ts` | Añadir 1 línea: `void notifyExternal(payload)` después de `broadcast(payload)` |
| `backend/worker/src/redis.ts` | Añadir 2 funciones al final: `getNotifPreferences()`, `saveNotifLog()` |
| `backend/worker/src/config.ts` | Añadir 4 exports: `SENDGRID_API_KEY`, `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `SENDGRID_FROM_EMAIL` |
| `backend/producer/src/server.ts` | Añadir 2 líneas: `import profileNotifRouter` + `app.use('/api/profile', profileNotifRouter)` |
| `backend/producer/src/infrastructure/factories/ServiceFactory.ts` | Añadir métodos: `getNotifPrefsRepository()`, `getGetNotifPrefsUseCase()`, `getSaveNotifPrefsUseCase()` |
| `frontend/src/app/app.config.ts` | Añadir 1 provider: `{ provide: NotificationPreferencesRepository, useClass: ... }` |
| `frontend/src/presentation/components/dashboard/dashboard.component.ts` | Añadir `<app-notification-preferences>` en template (solo si `isAdmin()`) |

---

## 10. ⚠️ Verificaciones Previas a Implementar (HUMAN CHECKS)

> Antes de iniciar `/speckit.tasks`, confirmar:

1. **Redis en Producer:** ✅ VERIFICADO — El producer NO tiene cliente Redis.
   Será necesario `npm install redis` + crear `infrastructure/config/redis.ts`.
   Se inicializará en `startServer()` antes de `app.listen()`.
   
2. **`docker-compose.yml`:** ¿Las variables de entorno del worker ya incluyen
   `SENDGRID_API_KEY` etc.? Si no, añadir antes de implementar.
   
3. **Acceso Admin a notif-preferences:** ¿El endpoint debe ser solo para admins
   o para cualquier usuario autenticado? Por constitución §4.3, cualquier user
   puede configurar sus propias preferencias → `authMiddleware` sin `requireAdmin`.

4. **Red compartida entre Worker y Backend para Redis:** En `docker-compose.yml`
   ambos servicios ya comparten `cyberguard-network` y usan el mismo `REDIS_URL`.
   Confirmar que `notif:prefs:{username}` es accesible desde ambos.
