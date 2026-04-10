# Arquitectura, Patrones de Diseño y Principios SOLID — CyberGuard System

## Índice

1. [Proceso de Implementación de la Épica](#1-proceso-de-implementación-de-la-épica)
2. [Patrones de Diseño Nuevos en la Épica](#2-patrones-de-diseño-nuevos-en-la-épica)
3. [Trazabilidad Arquitectónica (Diseño a Código)](#3-trazabilidad-arquitectónica-diseño-a-código)
4. [Cohesión y Desacoplamiento (SOLID)](#4-cohesión-y-desacoplamiento-solid)
5. [Resolución de Complejidad (Patrones)](#5-resolución-de-complejidad-patrones)
   - [5.1: Arquitectura Orientada a Eventos (EDA)](#51-arquitectura-orientada-a-eventos-eda--patrones)
6. [Refinamiento Sintáctico (Anti-Smells)](#6-refinamiento-sintáctico-anti-smells)
7. [Evidencia por Archivo](#7-evidencia-por-archivo)
8. [Resumen de Patrones Nuevos de la Épica](#resumen-de-patrones-nuevos-de-la-épica)

---

## 1. Proceso de Implementación de la Épica

### 1.1 Flujo ASDD (Agent Spec Software Development)

La épica siguió un pipeline estructurado en fases secuenciales y paralelas:

```
        ┌─────────────────────────────┐
        │   FASE 1 — Especificación   │
        │   Spec Generator            │
        │   Requerimiento → Spec .md  │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────────────┐
        │  FASE 2 — Implementación    │
        │  (paralelo)                 │
        │  ┌────────────────────────┐ │
        │  │ Backend Developer      │ │
        │  │ Frontend Developer     │ │
        │  │ Database Agent         │ │
        │  └────────────────────────┘ │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────────────┐
        │  FASE 3 — Testing           │
        │  (paralelo)                 │
        │  ┌────────────────────────┐ │
        │  │ Test Engineer Backend  │ │
        │  │ Test Engineer Frontend │ │
        │  └────────────────────────┘ │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────────────┐
        │  FASE 4 — QA & Validación   │
        │  Gherkin, Riesgos, Perf.    │
        └─────────────────────────────┘
```

### 1.2 Specs Aprobadas (Fuente de Verdad)

Antes de escribir una sola línea de código, se generaron y aprobaron las especificaciones técnicas:

| ID | Feature | Ruta | Estado |
|----|---------|------|--------|
| SPEC-001 | Gestión de Usuarios | `.github/specs/user-management.spec.md` | **APPROVED** |
| SPEC-002 | Creación de Incidentes | `.github/specs/create-incident.spec.md` | **APPROVED** |

Cada spec define: historias de usuario, criterios de aceptación (Gherkin), modelo de datos, endpoints, reglas de negocio y casos edge. La implementación respeta fielmente lo documentado.

### 1.3 Del Documento al Código

```
Requirement (.github/requirements/)
    ↓
Spec Técnica (.github/specs/) — aprobada antes de implementar
    ↓
Domain Layer — entidades, puertos, value objects, excepciones
    ↓
Application Layer — use cases que orquestan la lógica de negocio
    ↓
Infrastructure Layer — adaptadores (PostgreSQL, Redis, RabbitMQ, Firebase)
    ↓
Presentation Layer — controllers (backend) / components (frontend)
```

---

## 2. Patrones de Diseño Nuevos en la Épica

### 2.1 Alcance de la Épica

La épica F4 (Notificaciones y Perfil) es la feature principal del sprint. Se construye **sobre** la infraestructura ya existente (hexagonal, Pub/Sub, Repository, etc.) e introduce patrones nuevos enfocados en:
- **EP-01**: Gestión de datos personales y preferencias de notificación
- **EP-02**: Notificación en tiempo real dentro de la plataforma (Worker + WebSocket)
- **EP-03**: Notificación externa multicanal (Email vía SendGrid, WhatsApp vía Twilio)

> **Nota**: Patrones como Hexagonal Architecture, Strategy (clasificación de amenazas), Factory Method (`Threat.create()`), Repository (amenazas, usuarios, incidentes), Composition Root, Pub/Sub, Publisher Confirms, Event Envelope y Singleton ya existían antes de esta épica y no se documentan aquí.

### 2.2 F4: Notificaciones y Perfil (EP-01, EP-02, EP-03) — Patrones Nuevos

**Feature principal de la épica.** Sistema de notificaciones multicanal + gestión de perfil y preferencias del administrador.

```
EP-01: Gestión de datos personales y contacto (HU-01, HU-02)
EP-02: Notificación en tiempo real dentro de la plataforma (HU-03)
EP-03: Notificación externa multicanal (HU-04, HU-05)
```

| Patrón | Épica | Dónde se aplica | Archivo(s) clave | Problema que resolvió |
|--------|-------|----------------|-------------------|----------------------|
| **Adapter Pattern** | EP-03 | Canales de notificación | `INotificationService` → `EmailAdapter` (SendGrid), `WhatsAppAdapter` (Twilio), `LogNotificationAdapter` | Intercambiar proveedores (ej: SendGrid→SES) sin tocar la lógica interna |
| **Strategy Pattern** | EP-03 | Contenido de notificaciones | `category-template.strategy.ts` — templates por tipo de amenaza | Notificación personalizada según categoría sin `switch` monolítico |
| **Observer Pattern** | EP-02/03 | Worker reacciona a eventos | Worker `connectAndConsume()` → `onMessage` callback | El Worker observa la cola y reacciona sin que el Producer lo conozca |
| **Orchestrator Pattern** | EP-03 | Coordinación multi-canal | `NotificationOrchestrator.dispatch()` con `Promise.allSettled` | Despachar email + WhatsApp en paralelo sin fallo cascada |
| **Retry + Exponential Backoff** | EP-03 | Tolerancia a fallos externos | `EmailAdapter`, `WhatsAppAdapter` — 3 intentos, delay 1s→2s→4s | APIs externas con fallos transitorios no pierden notificaciones |
| **Graceful Degradation** | EP-03 | Fallback sin APIs configuradas | `buildOrchestrator()` → `LogNotificationAdapter` | Worker funciona en dev/CI sin credenciales reales |
| **Dead Letter Exchange (DLX)** | EP-02/03 | Mensajes que fallan procesamiento | `cyberguard.dlx` + `failed.messages` queue | Capturar errores sin perder mensajes ni bloquear la cola |
| **Manual ACK/NACK** | EP-02/03 | Control de procesamiento | Worker `rabbitmq.ts` — `noAck: false`, `ch.ack()`, `ch.nack()` | Solo eliminar mensaje de la cola tras procesar exitosamente |
| **Pipeline de Procesamiento** | EP-02/03 | Flujo secuencial de mensaje | `handleMessage → saveToRedis → broadcast → dispatch` | Cada etapa tiene responsabilidad única; fallo → NACK global |
| **Back-pressure (Drain)** | EP-02/03 | Saturación del broker | `publishEvent()` detecta buffer full → espera `drain` | Prevenir pérdida de mensajes bajo alta carga |
| **Repository Pattern** | EP-01 | Preferencias de notificación | `NotificationPreferencesRepository` → `RedisNotificationPreferencesRepository` | Persistir prefs en Redis (baja latencia, alta disponibilidad) |
| **Repository Pattern** | EP-01 | Perfil del admin | `UserRepository.updateProfile()` — `PostgresUserRepository` | Actualización parcial de campos (phone con CASE/WHEN) |
| **Use Case Pattern** | EP-01 | Operaciones de perfil | `GetAdminProfileUseCase`, `UpdateAdminProfileUseCase`, `GetNotificationPreferencesUseCase`, `SaveNotificationPreferencesUseCase` | SRP: una clase = una operación de negocio |
| **Event History (Cache)** | EP-02 | Historial WebSocket | Worker `redis.ts` — lista `cg:ws:history` (LPUSH + LTRIM cap=200) | Re-enviar historial a clientes que reconectan |
| **Fan-out a Usuarios** | EP-03 | Despacho masivo | Worker loop sobre `getAllNotifPreferences()` | Cada evento notifica a todos los usuarios con prefs activas |
| **Auto-reconnect** | EP-02 | Resiliencia de conexión | Worker `connection.on('close', () => setTimeout(reconnect, 2000))` | Reconexión automática sin intervención manual |
| **Graceful Shutdown** | EP-02/03 | Cierre ordenado | `SIGINT` → `closeRabbit → closeRedis → closeWebSocket` | Prevenir mensajes huérfanos y puertos ocupados |
| **CQRS-like Separation** | EP-02/03 | Procesos separados | Producer (write) vs Worker (read/react) | Escalar Producer y Worker independientemente |
| **Queue-Based Load Leveling** | EP-02/03 | Absorción de picos | RabbitMQ entre Producer y Worker | Picos de amenazas no saturan al Worker |

---

## 3. Trazabilidad Arquitectónica (Diseño a Código)

### 3.1 Arquitectura Hexagonal — Backend

El backend sigue Hexagonal Architecture (Ports & Adapters) con separación estricta en 4 capas:

```
backend/producer/src/
├── domain/                         ← CORE: 100% aislado de frameworks
│   ├── entities/                   ← Threat, Incident, NotificationPreferences
│   ├── ports/                      ← Interfaces (contratos abstractos)
│   ├── services/                   ← ThreatClassifier, IncidentFactory
│   ├── value-objects/              ← IncidentStatus, UserRole
│   └── exceptions/                 ← DomainError y 10 excepciones específicas
│
├── application/                    ← Orquestación: depende SOLO de domain/ports
│   ├── use-cases/                  ← 13 use cases (uno por operación)
│   └── services/                   ← AuthService, ThreatService
│
├── infrastructure/                 ← Adaptadores: implementan los puertos
│   ├── persistence/                ← Postgres*, Redis* (implementan repositories)
│   ├── providers/                  ← Firebase, JWT, RabbitMQ
│   ├── factories/                  ← ServiceFactory (composition root)
│   ├── classification/             ← 5 estrategias de clasificación
│   ├── http/controllers/           ← Controladores Express
│   ├── http/middlewares/           ← Auth, brute-force, validation, error
│   └── config/                     ← Database, Redis, RabbitMQ, env, logger
│
└── types/                          ← Tipado TypeScript compartido
```

#### Aislamiento del Core Domain

El directorio `domain/` no contiene **ningún import** de:
- Express, Joi, PostgreSQL, Redis, RabbitMQ, Firebase
- Ninguna librería HTTP, ORM ni driver de base de datos

Los puertos (`domain/ports/`) son interfaces TypeScript puras que definen contratos sin conocer la tecnología que los implementa.

### 3.2 Arquitectura Hexagonal — Frontend

El frontend Angular replica la misma arquitectura hexagonal:

```
frontend/cyberguard-system-appv2/src/
├── core/
│   ├── domain/
│   │   ├── models/                ← 21 modelos de dominio (interfaces TS)
│   │   └── ports/                 ← 8 abstract classes (contratos)
│   ├── application/
│   │   └── use-cases/             ← 18 use cases
│   └── infrastructure/
│       ├── services/              ← 11 implementaciones (HttpClient, WebSocket)
│       ├── mappers/               ← DTO ↔ Domain transformations
│       └── handlers/              ← Global error handler
│
├── presentation/
│   └── components/                ← Componentes Angular (UI pura)
│
├── shared/
│   ├── factories/                 ← ThreatValidationFactory
│   └── strategies/                ← 5 estrategias de validación
│
└── environments/                  ← Configuración de entorno
```

#### Sin fugas de frameworks en el dominio

Los puertos del frontend usan `abstract class` (requerido por el DI de Angular) pero no importan `HttpClient`, `WebSocket` ni ningún servicio Angular. Solo exponen `Observable<T>` como tipo de retorno (RxJS es la primitiva reactiva del stack, no un framework HTTP).

### 3.3 Correspondencia Diseño → Código

| Concepto del Diseño | Artefacto en Código | Ubicación |
|---------------------|---------------------|-----------|
| Entidad de Dominio | `Threat`, `Incident` | `domain/entities/` |
| Puerto de Repositorio | `ThreatRepository`, `UserRepository` | `domain/ports/` |
| Puerto de Mensajería | `EventPublisher` | `domain/ports/` |
| Estrategia de Clasificación | `ThreatClassificationStrategy` | `domain/ports/` |
| Caso de Uso | `CreateIncidentUseCase`, etc. | `application/use-cases/` |
| Adaptador de Persistencia | `PostgresThreatRepository` | `infrastructure/persistence/` |
| Adaptador de Auth | `FirebaseAuthProvider` | `infrastructure/providers/` |
| Composition Root | `ServiceFactory` | `infrastructure/factories/` |
| Value Object | `IncidentStatus`, `UserRole` | `domain/value-objects/` |
| Excepción de Dominio | `DomainError` → 10 subclases | `domain/exceptions/` |

---

## 4. Cohesión y Desacoplamiento (SOLID)

### 4.1 S — Single Responsibility Principle (SRP)

**Cada clase tiene una única razón para cambiar.**

| Clase (nueva en la épica) | Responsabilidad Única |
|-------|----------------------|
| `ProcessThreatEventUseCase` | Pipeline: sanitizar → persistir → broadcast → despachar notificaciones |
| `ProcessDeletedThreatUseCase` | Eliminar evento del historial y notificar por WebSocket |
| `NotificationOrchestrator` | Coordinar despacho paralelo a múltiples canales |
| `EmailAdapter` | Enviar notificación por SendGrid con retry |
| `WhatsAppAdapter` | Enviar notificación por Twilio con retry |
| `WebSocketBroadcaster` | Gestionar conexiones WS y enviar payloads a clientes |
| `RedisEventRepository` | Persistir y consultar historial de eventos en Redis |
| `RabbitMQConsumer` | Consumir mensajes del broker con ACK/NACK manual |
| `WorkerServiceFactory` | Composition Root del Worker — único lugar que instancia concretas |

**Evidencia concreta — `ProcessThreatEventUseCase`:**

```typescript
// application/use-cases/ProcessThreatEventUseCase.ts
export class ProcessThreatEventUseCase {
  constructor(
    private readonly repository: IEventRepository,              // puerto
    private readonly broadcaster: IBroadcaster,                 // puerto
    private readonly orchestrator: INotificationOrchestrator,   // puerto
  ) {}

  async execute(data: unknown, routingKey: string): Promise<void> {
    const payload = buildPayload(data, routingKey);   // 1. Sanitizar
    await this.repository.save(payload);               // 2. Persistir
    this.broadcaster.broadcast(payload);               // 3. Broadcast WS
    // 4. Notificar — fan-out a todos los usuarios con prefs activas
    const allPrefs = await this.repository.getAllNotifPreferences();
    for (const prefs of allPrefs) {
      await this.orchestrator.dispatch(notifPayload, prefs);
    }
  }
}
```

Este use case **no sabe** si el repository es Redis o DynamoDB, si el broadcaster es WebSocket o SSE, ni si el orchestrator usa SendGrid o Mailgun. Solo habla con puertos.

### 4.2 O — Open/Closed Principle (OCP)

**Abierto para extensión, cerrado para modificación.**

El patrón Adapter implementado en `INotificationService` permite agregar nuevos canales de notificación sin modificar código existente:

```
                    ┌─────────────────────────┐
                    │  INotificationService    │
                    │  (Puerto)               │
                    │                         │
                    │  send(payload): Result   │
                    └─────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼──────────┐
    │  EmailAdapter   │ │WhatsAppAdapter│ │LogNotification  │
    │  (SendGrid)     │ │(Twilio)       │ │Adapter (fallback│
    └────────────────┘ └──────────────┘ └─────────────────┘
```

Para agregar un nuevo canal (ej: Telegram):
1. Crear `TelegramAdapter` implementando `INotificationService`
2. Registrarlo en `WorkerServiceFactory`
3. **No se modifica** ni `EmailAdapter`, ni `WhatsAppAdapter`, ni `NotificationOrchestrator` (OCP)

### 4.3 L — Liskov Substitution Principle (LSP)

**Cualquier implementación es sustituible por su interfaz.**

Ejemplo concreto: `LogNotificationAdapter` puede reemplazar transparentemente a `EmailAdapter` porque ambas implementan `INotificationService`:

```typescript
// Puerto (abstracción)
export interface INotificationService {
  send(payload: NotifPayload): Promise<NotifResult>;
}

// Implementación real
export class EmailAdapter implements INotificationService { /* SendGrid API */ }

// Implementación fallback (sustituible)
export class LogNotificationAdapter implements INotificationService { /* solo logging */ }
```

En el `WorkerServiceFactory`, cuando no hay credenciales de SendGrid, se sustituye `EmailAdapter` por `LogNotificationAdapter` sin que el `NotificationOrchestrator` note la diferencia.

### 4.4 I — Interface Segregation Principle (ISP)

**Interfaces pequeñas y enfocadas, sin métodos innecesarios.**

| Puerto (nuevo en la épica) | Métodos | Propósito |
|--------|---------|-----------|
| `INotificationService` | 1 (`send`) | Solo enviar una notificación |
| `INotificationOrchestrator` | 1 (`dispatch`) | Solo coordinar multi-canal |
| `IBroadcaster` | 3 (`start`, `broadcast`, `close`) | Solo gestionar WebSocket |
| `IMessageConsumer` | 2 (`consume`, `close`) | Solo consumir del broker |
| `IEventRepository` | 8 métodos cohesivos | Solo gestionar historial de eventos |

Ningún consumidor se ve obligado a depender de métodos que no usa. El `NotificationOrchestrator` solo ve `INotificationService.send()`, no sabe nada de `IEventRepository` ni de `IBroadcaster`.

### 4.5 D — Dependency Inversion Principle (DIP)

**Las capas superiores dependen de abstracciones, no de implementaciones.**

```
  ┌─────────────────────────────────────────────────────────┐
  │              DOMAIN (centro) — Worker                   │
  │   Ports: IBroadcaster, IEventRepository,               │
  │          IMessageConsumer, INotificationService,        │
  │          INotificationOrchestrator                      │
  │   ► NO depende de NADA externo                         │
  └────────────────────────┬────────────────────────────────┘
                           │ define contratos
  ┌────────────────────────▼────────────────────────────────┐
  │                   APPLICATION                           │
  │   ProcessThreatEventUseCase, ProcessDeletedThreatUseCase│
  │   ► Depende SOLO de domain/ports                       │
  └────────────────────────┬────────────────────────────────┘
                           │ implementa contratos
  ┌────────────────────────▼────────────────────────────────┐
  │                  INFRASTRUCTURE                         │
  │   RedisEventRepository, RabbitMQConsumer,               │
  │   WebSocketBroadcaster, EmailAdapter, WhatsAppAdapter   │
  │   WorkerServiceFactory (composition root)               │
  │   ► Conoce las implementaciones concretas              │
  └─────────────────────────────────────────────────────────┘
```

**Evidencia — `WorkerServiceFactory` como Composition Root:**

```typescript
// infrastructure/WorkerServiceFactory.ts
static getProcessThreatEventUseCase(): ProcessThreatEventUseCase {
  return new ProcessThreatEventUseCase(
    this.getRepository(),      // → retorna IEventRepository (puerto)
    this.getBroadcaster(),     // → retorna IBroadcaster (puerto)
    this.getOrchestrator(),    // → retorna INotificationOrchestrator (puerto)
  );
}

// Internamente:
static getRepository(): RedisEventRepository {
  if (!this.repository) {
    this.repository = new RedisEventRepository(); // ← ÚNICO lugar que sabe de Redis
  }
  return this.repository;
}
```

El `ProcessThreatEventUseCase` nunca ve `RedisEventRepository`. Solo ve `IEventRepository`. Si mañana migramos a DynamoDB, cambiamos UNA línea en `WorkerServiceFactory` y el use case no se entera.

---

## 5. Resolución de Complejidad (Patrones Nuevos)

> Los patrones preexistentes (Strategy para clasificación, Factory para entidades, Repository genérico, Composition Root del Producer) no se detallan aquí porque ya existían antes de la épica. Esta sección documenta únicamente los patrones **introducidos** en F4.

### 5.1 Arquitectura Orientada a Eventos (EDA) — Patrones

El sistema CyberGuard implementa una **arquitectura orientada a eventos** (Event-Driven Architecture) donde el **Producer** genera eventos de amenazas detectadas y el **Worker** los consume, procesa y reacciona de forma asíncrona. RabbitMQ actúa como broker de mensajes entre ambos servicios.

### 5.1.1 Visión General del Flujo de Eventos

```
  ┌──────────────────────────────────────────────────────────────────────────────┐
  │                           PRODUCER (Backend)                                │
  │                                                                              │
  │  ThreatService.reportThreat()                                               │
  │    1. Threat.create()             ← Factory Method                          │
  │    2. threatRepository.save()     ← Persiste en PostgreSQL                  │
  │    3. eventPublisher.publish()    ← Publica evento a RabbitMQ               │
  │       routingKey: "threat.detected.{type}"                                  │
  │       evento: { eventId, eventType, timestamp, data: {...} }                │
  └───────────────────────────────┬──────────────────────────────────────────────┘
                                  │
                       ┌──────────▼──────────┐
                       │     RabbitMQ         │
                       │                     │
                       │  Exchange: topic     │
                       │  "cyberguard.events" │
                       │                     │
                       │  DLX: direct         │
                       │  "cyberguard.dlx"    │
                       │  → "failed.messages" │
                       └──────────┬──────────┘
                                  │
  ┌───────────────────────────────▼──────────────────────────────────────────────┐
  │                            WORKER                                            │
  │                                                                              │
  │  connectAndConsume(onMessage)               ← Suscripción con topic "#"     │
  │    │                                                                         │
  │    ▼ Pipeline de Procesamiento:                                              │
  │    ┌─────────────────┐                                                       │
  │    │ 1. handleMessage │  ← Sanitiza, valida, construye payload               │
  │    └────────┬────────┘                                                       │
  │    ┌────────▼────────┐                                                       │
  │    │ 2. saveToRedis   │  ← Persiste en historial (cap 200)                  │
  │    └────────┬────────┘                                                       │
  │    ┌────────▼────────┐                                                       │
  │    │ 3. broadcast     │  ← Envía por WebSocket a clientes conectados        │
  │    └────────┬────────┘                                                       │
  │    ┌────────▼────────────────────────────────────────────────────┐            │
  │    │ 4. NotificationOrchestrator.dispatch()                      │           │
  │    │    → Para cada usuario con preferencias activas:             │           │
  │    │      ┌──────────────────┐  ┌──────────────────┐             │           │
  │    │      │  EmailAdapter    │  │  WhatsAppAdapter  │             │           │
  │    │      │  (SendGrid)      │  │  (Twilio)         │             │           │
  │    │      └──────────────────┘  └──────────────────┘             │           │
  │    │    → Promise.allSettled (paralelo, sin fallo cascada)       │           │
  │    └─────────────────────────────────────────────────────────────┘           │
  │                                                                              │
  │    ch.ack(msg)    ← ACK manual tras procesamiento exitoso                   │
  │    ch.nack(msg)   ← NACK sin re-enqueue → va al DLX                        │
  └──────────────────────────────────────────────────────────────────────────────┘
```

### 5.1.2 Dead Letter Exchange (DLX)

**Complejidad que resuelve**: Los mensajes que fallan el procesamiento no deben perderse ni re-encolarse infinitamente. El DLX los captura en una cola aparte para análisis post-mortem.

```typescript
// Producer — configura el DLX
await this.channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
await this.channel.assertQueue('failed.messages', { durable: true });
await this.channel.bindQueue('failed.messages', DLX_EXCHANGE, '');

// Worker — rechaza sin re-encolar (va al DLX)
ch.nack(msg, false, false);   // allUpTo=false, requeue=false → DLX
```

**Flujo de un mensaje fallido:**

```
Evento → Exchange (topic) → Worker Queue → NACK → DLX Exchange (direct) → failed.messages Queue
```

Los mensajes en `failed.messages` pueden inspeccionarse manualmente o procesarse con un Worker de recuperación.

### 5.1.3 Back-pressure y Drain

**Complejidad que resuelve**: Cuando el Producer envía eventos más rápido de lo que RabbitMQ puede aceptar, el buffer del canal se llena. Sin manejo de back-pressure, se pierden mensajes o el proceso se bloquea.

```typescript
// infrastructure/config/rabbitmq.ts
const published = ch.publish(EXCHANGE, routingKey, message, options, callback);

if (!published) {
  logger.warn('RabbitMQ channel buffer full, waiting for drain', { routingKey });
  ch.once('drain', () => {
    logger.info('RabbitMQ channel drained, resuming', { routingKey });
  });
}
```

### 5.1.4 Manual ACK/NACK con Auto-reconnect

**Complejidad que resuelve**: Con `autoAck`, un mensaje se pierde si el Worker falla a mitad del procesamiento. Con ACK manual, el mensaje solo se elimina de la cola cuando el Worker confirma que lo procesó correctamente.

```typescript
// worker/src/rabbitmq.ts
await ch.consume(q.queue, async (msg) => {
  try {
    const data = JSON.parse(msg.content.toString());
    await onMessage(data, msg.fields.routingKey, msg);
    ch.ack(msg);      // ← solo se confirma tras procesamiento exitoso
  } catch (err) {
    ch.nack(msg, false, false);  // ← rechaza sin re-encolar → DLX
  }
}, { noAck: false });            // ← ACK manual habilitado
```

**Auto-reconnect** ante desconexiones transitorias:

```typescript
connection.on('close', () => {
  logger.warn('RabbitMQ connection closed, reconnecting in 2s');
  setTimeout(() => connectAndConsume(onMessage).catch(() => {}), 2000);
});
```

### 5.1.5 Adapter Pattern — Canales de Notificación

**Complejidad que resuelve**: El Worker necesita enviar notificaciones por múltiples canales (email, WhatsApp) cada uno con su propia API. Sin abstracción, el código de despacho estaría lleno de condicionales y duplicación.

```
  ┌───────────────────────────────────┐
  │     INotificationService          │  ← Interfaz (puerto)
  │     send(payload): Promise<Result>│
  └───────────────┬───────────────────┘
                  │
     ┌────────────┼────────────────┐
     │            │                │
┌────▼───────┐ ┌──▼───────────┐ ┌─▼──────────────────┐
│ EmailAdapter│ │WhatsAppAdapter│ │LogNotificationAdapter│
│ (SendGrid)  │ │(Twilio REST)  │ │(solo logging)       │
│ retry: 3x   │ │retry: 3x      │ │sin API externa      │
│ exp backoff │ │exp backoff    │ │fallback seguro      │
└─────────────┘ └───────────────┘ └─────────────────────┘
```

**Evidencia — Interfaz y adaptadores:**

```typescript
// notifications/notification.types.ts
export interface INotificationService {
  send(payload: NotifPayload): Promise<NotifResult>;
}

// notifications/email.adapter.ts — implementa con SendGrid
export class EmailAdapter implements INotificationService {
  async send(payload: NotifPayload): Promise<NotifResult> {
    // retry con exponential backoff (3 intentos, delay = min(1000 * 2^n, 30000))
  }
}

// notifications/whatsapp.adapter.ts — implementa con Twilio
export class WhatsAppAdapter implements INotificationService {
  async send(payload: NotifPayload): Promise<NotifResult> {
    // retry con exponential backoff (3 intentos)
  }
}

// notifications/log-notification.adapter.ts — fallback
export class LogNotificationAdapter implements INotificationService {
  async send(payload: NotifPayload): Promise<NotifResult> {
    logger.info(`[LOG-ONLY] ${this.canal} notification`, { payload });
    return { canal: this.canal, status: 'success', attempts: 1 };
  }
}
```

**¿Por qué es extensible?** Para agregar notificaciones por Telegram:
1. Crear `TelegramAdapter` implementando `INotificationService`
2. Registrarlo en `buildOrchestrator()`
3. **No se modifica** `EmailAdapter`, `WhatsAppAdapter` ni `NotificationOrchestrator` (OCP)

### 5.1.6 Orchestrator Pattern — Coordinación de Notificaciones

**Complejidad que resuelve**: Despachar a múltiples canales en paralelo sin que el fallo de uno afecte a los demás. `Promise.allSettled` garantiza que todos los canales se intentan sin importar errores individuales.

```typescript
// notifications/notification.orchestrator.ts
export class NotificationOrchestrator {
  constructor(
    private readonly emailService: INotificationService,
    private readonly whatsappService: INotificationService,
  ) {}

  async dispatch(payload: NotifPayload, prefs: StoredNotifPreferences): Promise<NotifResult[]> {
    const promises: Promise<NotifResult>[] = [];

    if (prefs.emailEnabled && prefs.email) {
      promises.push(this.emailService.send({ ...payload, recipientEmail: prefs.email }));
    }
    if (prefs.whatsappEnabled && prefs.phone) {
      promises.push(this.whatsappService.send({ ...payload, recipientPhone: prefs.phone }));
    }

    const settled = await Promise.allSettled(promises);
    return settled.map(r => r.status === 'fulfilled' ? r.value : /* error result */);
  }
}
```

### 5.1.7 Graceful Degradation — Fallback a Logging

**Complejidad que resuelve**: Si las credenciales de SendGrid o Twilio no están configuradas, el Worker no debe fallar. En su lugar, usa un adaptador que solo loguea la notificación.

```typescript
// worker/src/index.ts — buildOrchestrator()
const emailService = sgKey && sgFrom
  ? new EmailAdapter(sgKey, sgFrom)           // ← con API real
  : new LogNotificationAdapter('email');       // ← fallback: solo log

const whatsappService = twSid && twToken
  ? new WhatsAppAdapter(twSid, twToken, twFrom)
  : new LogNotificationAdapter('whatsapp');    // ← fallback: solo log
```

Esto permite que el Worker funcione en **modo degradado** en ambientes de desarrollo o CI donde no hay credenciales de APIs externas.

### 5.1.8 Retry con Exponential Backoff

**Complejidad que resuelve**: Las APIs externas (SendGrid, Twilio) pueden tener fallos transitorios (rate limits, timeouts). Sin reintentos, una notificación se pierde ante un error temporal.

```typescript
// Patrón implementado en EmailAdapter y WhatsAppAdapter
const MAX_ATTEMPTS = 3;
const BASE_DELAY = 1000;
const MAX_DELAY = 30_000;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    await sendNotification();
    return { status: 'success', attempts: attempt };
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) {
      const delay = Math.min(BASE_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
      await sleep(delay);   // 1s → 2s → 4s (nunca más de 30s)
    }
  }
}
```

### 5.1.9 Strategy Pattern — Templates de Notificación

**Complejidad que resuelve**: Cada tipo de amenaza requiere un mensaje diferente en las notificaciones. Sin Strategy, habría un `switch` con bloques de texto duplicados.

```typescript
// notifications/category-template.strategy.ts
const TEMPLATES: Record<string, { subject: string; body: string }> = {
  malware:   { subject: '🦠 Malware Detected', body: '...' },
  phishing:  { subject: '🎣 Phishing Alert', body: '...' },
  ddos:      { subject: '🌊 DDoS Attack', body: '...' },
  intrusion: { subject: '🔓 Intrusion Detected', body: '...' },
  other:     { subject: '⚠️ Security Alert', body: '...' },
};

export function selectTemplate(type: string) { return TEMPLATES[type] ?? TEMPLATES['other']; }
export function renderTemplate(template: string, vars: Record<string, string>) { /* replace placeholders */ }
```

### 5.1.10 Pipeline de Procesamiento (Worker)

**Complejidad que resuelve**: Cada mensaje pasa por etapas secuenciales bien definidas. Si una etapa falla, el mensaje se rechaza globalmente (NACK). Esto crea un flujo predecible y auditable.

```
    Mensaje RabbitMQ
         │
    ┌────▼─────────────┐
    │ 1. handleMessage  │ → Sanitiza caracteres peligrosos (<>"'&)
    │                   │ → Valida estructura del payload
    │                   │ → Construye objeto tipado (Payload)
    └────┬──────────────┘
    ┌────▼─────────────┐
    │ 2. saveToRedis    │ → Persiste en lista Redis (LPUSH + LTRIM cap=200)
    │                   │ → Permite historial para nuevos clientes WebSocket
    └────┬──────────────┘
    ┌────▼─────────────┐
    │ 3. broadcast      │ → Envía a todos los clientes WebSocket conectados
    │                   │ → Dashboard recibe la amenaza en tiempo real
    └────┬──────────────┘
    ┌────▼────────────────────────┐
    │ 4. NotificationOrchestrator │ → Lee preferencias de TODOS los usuarios
    │                             │ → Despacha email + WhatsApp en paralelo
    │                             │ → Cada canal tiene retry independiente
    └────┬────────────────────────┘
         │
    ch.ack(msg) ← procesamiento completado
```

### 5.1.11 Graceful Shutdown

**Complejidad que resuelve**: Sin shutdown ordenado, las conexiones a RabbitMQ, Redis y WebSocket quedan abiertas, los mensajes en procesamiento se pierden y los puertos quedan ocupados.

```typescript
// worker/src/index.ts
process.on('SIGINT', async () => {
  logger.info('Worker shutting down');
  await closeRabbit();     // 1. Dejar de consumir mensajes
  await closeRedis();      // 2. Cerrar conexión a Redis
  await closeWebSocket();  // 3. Cerrar servidor WebSocket
  process.exit(0);
});

// producer — RabbitMQConnection.close()
async close(): Promise<void> {
  await this.channel.waitForConfirms();  // 1. Esperar confirmaciones pendientes
  await this.channel.close();            // 2. Cerrar canal
  await this.connection.close();         // 3. Cerrar conexión
}
```

### 5.1.12 Separación CQRS-like (Producer vs Worker)

**Complejidad que resuelve**: Mezclar la escritura de datos con la reacción a eventos crea un monolito difícil de escalar. Con procesos separados, cada servicio puede escalar independientemente.

```
  ┌───────────────────┐                    ┌───────────────────────┐
  │     PRODUCER       │                    │       WORKER          │
  │                   │                    │                       │
  │  Responsabilidades:│     RabbitMQ      │  Responsabilidades:   │
  │  - Recibir HTTP    │  ─────────────►   │  - Consumir eventos   │
  │  - Validar input   │   (async, fire    │  - Procesar datos     │
  │  - Persistir threat│    & forget)      │  - Notificar usuarios │
  │  - Publicar evento │                    │  - Push WebSocket     │
  │                   │                    │  - Almacenar historial│
  │  NO sabe de:       │                    │                       │
  │  - Notificaciones  │                    │  NO sabe de:          │
  │  - WebSocket       │                    │  - HTTP / Express     │
  │  - Templates       │                    │  - Validación REST    │
  └───────────────────┘                    └───────────────────────┘
```

El Producer no conoce ni depende de ningún concepto del Worker (notificaciones, WebSocket, templates). El Worker no conoce ni depende de Express, middlewares o validación HTTP. El **único contrato** entre ambos es la estructura del evento publicado en RabbitMQ.

---

## 6. Refinamiento Sintáctico (Anti-Smells)

### 6.1 Nombrado Intencional

El código usa nombres descriptivos que comunican propósito, no implementación:

| Tipo | Ejemplo | Anti-patrón evitado |
|------|---------|---------------------|
| Variable | `recommendedSeverity` | ~~`data`~~, ~~`result`~~, ~~`value`~~ |
| Método | `isHighSeverity()` | ~~`checkSev()`~~, ~~`doCheck()`~~ |
| Clase | `MalwareClassificationStrategy` | ~~`Strategy1`~~, ~~`Handler`~~ |
| Use Case | `CreateIncidentUseCase` | ~~`IncidentManager`~~, ~~`IncidentHelper`~~ |
| Excepción | `DuplicateIncidentError` | ~~`CustomError`~~, ~~`AppError`~~ |
| Puerto | `ThreatClassificationStrategy` | ~~`IStrategy`~~, ~~`BaseStrategy`~~ |

### 6.2 Sin Código Muerto

- **Cero imports sin usar**: cada import se consume en el archivo
- **Cero bloques comentados**: no hay código comentado "por si acaso"
- **Cero variables sin referenciar**: revisado por el linter de TypeScript

### 6.3 Manejo de Errores Explícito

Las excepciones de dominio son tipadas y llevan contexto:

```typescript
// domain/exceptions/DomainError.ts — clase base con código estructurado
export abstract class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,                  // ejemplo: 'THREAT_NOT_FOUND'
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Uso específico
throw new ThreatNotFoundException(threatId);       // código: 'THREAT_NOT_FOUND'
throw new DuplicateIncidentError(threatId);        // mensaje descriptivo
throw new SelfModificationForbiddenError(userId);  // impide auto-desactivación
```

No hay `try/catch` vacíos ni errores genéricos `throw new Error("error")`.

### 6.4 Funciones Cortas y Cohesivas

Los métodos siguen la regla de una operación por función:

```typescript
// domain/entities/Threat.ts
isHighSeverity(): boolean {
  return this.severity === 'high' || this.severity === 'critical';
}

// domain/services/ThreatClassifier.ts
classify(context: ThreatContext): ThreatAnalysisResult {
  const strategy = this.strategies.get(context.type);
  if (!strategy) return this.defaultAnalysis(context);
  return strategy.analyze(context);
}
```

### 6.5 Constructores Privados + Factory Methods

Las entidades no exponen constructores públicos. Esto previene la creación de objetos en estado inválido:

```typescript
// ✅ Correcto — factory method con defaults
const threat = Threat.create({ type: 'malware', severity: 'high', sourceIp: '10.0.0.1', description: '...' });

// ❌ Imposible — constructor privado
const threat = new Threat(/* ... */); // Error: constructor is private
```

---

## 7. Evidencia por Archivo

### 7.1 Domain Layer — Puertos Nuevos (Worker)

| Archivo | Imports externos | Frameworks | Contrato |
|---------|------------------|------------|----------|
| `domain/ports/IBroadcaster.ts` | Ninguno | Ninguno | `start`, `broadcast`, `close` |
| `domain/ports/IEventRepository.ts` | Ninguno | Ninguno | `connect`, `save`, `getHistory`, `clearHistory`, `removeById`, `removeByThreatId`, `getAllNotifPreferences`, `close` |
| `domain/ports/IMessageConsumer.ts` | Ninguno | Ninguno | `consume`, `close` |
| `domain/ports/INotificationService.ts` | Ninguno | Ninguno | `send(payload): Promise<NotifResult>` |
| `domain/ports/INotificationOrchestrator.ts` | Ninguno | Ninguno | `dispatch(payload, prefs): Promise<NotifResult[]>` |
| `domain/services/MessageHandler.ts` | Ninguno | Ninguno | `buildPayload`, `handleMessage` — sanitización y validación |

### 7.2 Application Layer — Use Cases Nuevos

| Archivo | Depende de (puertos) | NO depende de |
|---------|-----------|---------------|
| `ProcessThreatEventUseCase` | `IEventRepository`, `IBroadcaster`, `INotificationOrchestrator` | Redis, WebSocket, SendGrid, Twilio |
| `ProcessDeletedThreatUseCase` | `IEventRepository`, `IBroadcaster` | Redis, WebSocket |
| `ThreatEventProcessorService` | Use cases anteriores + `MessageHandler` | Infraestructura |
| `GetAdminProfileUseCase` (Producer) | `UserRepository` | PostgreSQL |
| `UpdateAdminProfileUseCase` (Producer) | `UserRepository` | PostgreSQL |
| `GetNotificationPreferencesUseCase` (Producer) | `NotificationPreferencesRepository` | Redis |
| `SaveNotificationPreferencesUseCase` (Producer) | `NotificationPreferencesRepository` | Redis |

### 7.3 Infrastructure Layer — Adaptadores Nuevos

| Archivo | Implementa | Usa tecnología |
|---------|-----------|----------------|
| `RedisEventRepository` | `IEventRepository` | Redis (LPUSH/LTRIM) |
| `RabbitMQConsumer` | `IMessageConsumer` | amqplib (ACK/NACK manual) |
| `WebSocketBroadcaster` | `IBroadcaster` | ws (WebSocket server) |
| `EmailAdapter` | `INotificationService` | SendGrid (@sendgrid/mail) |
| `WhatsAppAdapter` | `INotificationService` | Twilio (axios REST) |
| `LogNotificationAdapter` | `INotificationService` | Winston (fallback) |
| `NotificationOrchestrator` | `INotificationOrchestrator` | Promise.allSettled |
| `CategoryTemplateStrategy` | Strategy (templates por tipo) | Mapeo estático |
| `WorkerServiceFactory` | Composition Root del Worker | Todas las concretas |
| `RedisNotificationPreferencesRepository` (Producer) | `NotificationPreferencesRepository` | Redis (ioredis) |

---

## Resumen de Patrones Nuevos de la Épica

> Solo patrones **introducidos** en F4 (Notificaciones y Perfil). No se listan patrones preexistentes como Hexagonal Architecture, Strategy (clasificación de amenazas), Factory Method (entidades), Repository (amenazas/usuarios/incidentes), Pub/Sub, Publisher Confirms, Event Envelope ni Singleton.

| Patrón | Dónde se aplica | Problema que resuelve |
|--------------------|-----------------|-----------------------|
| **Adapter Pattern** | `INotificationService` → `EmailAdapter`, `WhatsAppAdapter`, `LogNotificationAdapter` | Intercambio transparente de canales de notificación |
| **Orchestrator Pattern** | `NotificationOrchestrator.dispatch()` con `Promise.allSettled` | Coordinación paralela de múltiples canales sin fallo cascada |
| **Strategy Pattern (Templates)** | `CategoryTemplateStrategy` — templates por tipo de amenaza | Contenido personalizado sin `switch` monolítico |
| **Retry + Exponential Backoff** | `EmailAdapter`, `WhatsAppAdapter` — 3 intentos, 1s→2s→4s | Tolerancia a fallos transitorios de APIs externas |
| **Graceful Degradation** | `WorkerServiceFactory` → `LogNotificationAdapter` | Worker funciona sin credenciales de APIs externas |
| **Dead Letter Exchange (DLX)** | `cyberguard.dlx` + `failed.messages` queue | Mensajes fallidos capturados sin pérdida |
| **Manual ACK/NACK** | `RabbitMQConsumer` — `noAck: false`, `ch.ack()`, `ch.nack()` | Solo eliminar mensaje tras procesamiento exitoso |
| **Back-pressure (Drain)** | `RabbitMQConnection.publishEvent()` | Previene overflow del buffer bajo alta carga |
| **Pipeline de Procesamiento** | `sanitize → save → broadcast → dispatch notifications` | Flujo secuencial y predecible para cada mensaje |
| **Observer Pattern** | Worker consume eventos via callback `onMessage` | Reacción a eventos sin acoplamiento |
| **Event History (Cache)** | Redis lista `cg:ws:history` (LPUSH + LTRIM cap=200) | Re-envío de historial a clientes WebSocket que reconectan |
| **Fan-out a Usuarios** | Loop sobre `getAllNotifPreferences()` | Cada evento notifica a todos los usuarios con prefs activas |
| **Auto-reconnect** | `connection.on('close', () => setTimeout(reconnect, 2000))` | Reconexión automática al broker |
| **Graceful Shutdown** | `SIGINT` → `closeConsumer → closeRepository → closeBroadcaster` | Cierre ordenado de conexiones |
| **CQRS-like Separation** | Producer (write) vs Worker (read/react) | Escalar servicios independientemente |
| **Queue-Based Load Leveling** | RabbitMQ entre Producer y Worker | Picos de amenazas no saturan al Worker |
