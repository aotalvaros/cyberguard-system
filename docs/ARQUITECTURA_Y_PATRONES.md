# Arquitectura, Patrones de Diseño y Principios SOLID — CyberGuard System

## Índice

1. [Proceso de Implementación de la Épica](#1-proceso-de-implementación-de-la-épica)
2. [Patrones de Diseño Aplicados por Feature](#2-patrones-de-diseño-aplicados-por-feature)
3. [Trazabilidad Arquitectónica (Diseño a Código)](#3-trazabilidad-arquitectónica-diseño-a-código)
4. [Cohesión y Desacoplamiento (SOLID)](#4-cohesión-y-desacoplamiento-solid)
5. [Resolución de Complejidad (Patrones)](#5-resolución-de-complejidad-patrones)
   - 5.1–5.6: Patrones en Arquitectura Hexagonal (Strategy, Factory, Repository, Composition Root)
   - [5.7: Arquitectura Orientada a Eventos (EDA)](#57-arquitectura-orientada-a-eventos-eda--patrones)
6. [Refinamiento Sintáctico (Anti-Smells)](#6-refinamiento-sintáctico-anti-smells)
7. [Evidencia por Archivo](#7-evidencia-por-archivo)

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

## 2. Patrones de Diseño Aplicados por Feature

### 2.1 Mapa de Features y Épicas

El sistema CyberGuard se desarrolló en cuatro features principales, cada una con sus propias historias de usuario. A continuación se documenta **qué patrones de diseño se aplicaron en cada una** y en qué archivos concretos se materializan.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ÉPICAS DEL SISTEMA CYBERGUARD                            │
│                                                                              │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐   │
│  │ F1: Sistema Base de Amenazas       │  │ F2: Gestión de Usuarios IRMS │   │
│  │ (threat detection & management)    │  │ (SPEC-001)                   │   │
│  │ Preexistente                       │  │ CRUD + toggle status         │   │
│  └────────────────────────────────────┘  └──────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────┐   │
│  │ F3: Creación de Incidentes         │  │ F4: Notificaciones y Perfil  │   │
│  │ (SPEC-002)                         │  │ (EP-01, EP-02, EP-03)        │   │
│  │ Escalar amenaza → incidente        │  │ Feature principal de la épica│   │
│  └────────────────────────────────────┘  └──────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 F1: Sistema Base de Amenazas — Patrones Aplicados

El sistema base de detección y gestión de amenazas es la fundación sobre la cual se construyeron las demás features.

| Patrón | Dónde se aplica | Archivo(s) clave | Problema que resolvió |
|--------|----------------|-------------------|----------------------|
| **Hexagonal Architecture** | Todo el backend + frontend | `domain/`, `application/`, `infrastructure/` | Aislar el dominio de frameworks y tecnologías |
| **Strategy Pattern** | Clasificación de amenazas por tipo | `ThreatClassifier.ts`, `ThreatClassificationStrategies.ts` | 5 tipos de amenaza con reglas radicalmente distintas sin `if/else` |
| **Factory Method** | Creación de entidades con validación | `Threat.create()` (constructor privado) | Garantizar defaults y estado válido al instanciar |
| **Repository Pattern** | Persistencia de amenazas | `ThreatRepository` (puerto) → `PostgresThreatRepository` (adaptador) | Desacoplar SQL de la lógica de negocio |
| **Composition Root** | Wiring de dependencias | `ServiceFactory.ts` | Único punto que conoce implementaciones concretas |
| **Pub/Sub (Topic Exchange)** | Publicación de eventos de amenaza | `RabbitMQPublisher.ts` → exchange `cyberguard.events` | Desacoplamiento Producer ↔ Worker |
| **Publisher Confirms** | Garantía de entrega al broker | `RabbitMQConnection.publishEvent()` | At-least-once delivery |
| **Event Envelope** | Estructura estándar de eventos | `ThreatService.reportThreat()` → `{eventId, eventType, timestamp, data}` | Trazabilidad entre servicios |
| **Singleton** | Conexiones a infraestructura | `RabbitMQConnection.getInstance()` | Reutilización de conexiones sin duplicados |

### 2.3 F2: Gestión de Usuarios IRMS (SPEC-001) — Patrones Aplicados

Feature para crear, editar, listar y activar/desactivar usuarios del sistema de gestión de incidentes.

| Patrón | Dónde se aplica | Archivo(s) clave | Problema que resolvió |
|--------|----------------|-------------------|----------------------|
| **Repository Pattern** | Persistencia de usuarios | `UserRepository` (puerto) → `PostgresUserRepository` (adaptador) | CRUD desacoplado de PostgreSQL |
| **Use Case Pattern** | Operaciones de negocio | `CreateUserUseCase`, `UpdateUserUseCase`, `ToggleUserStatusUseCase`, `ListUsersUseCase` | SRP: cada operación en su propia clase |
| **Value Object** | Roles del sistema | `UserRole` enum con validación | Encapsular valores válidos del dominio |
| **Audit Log Pattern** | Trazabilidad de cambios | `AuditLogRepository.log()` en cada use case | Registrar quién hizo qué y cuándo |
| **Domain Exception Hierarchy** | Errores de negocio tipados | `UserNotFoundError`, `UserAlreadyExistsError`, `SelfModificationForbiddenError`, `RoleModificationNotAllowedException` | Errores específicos → HTTP status codes precisos |
| **Lazy Singleton** | Instanciación bajo demanda | `ServiceFactory.getCreateUserUseCase()`, etc. | Evitar instanciar dependencias no usadas |
| **Idempotent Toggle** | Activar/desactivar usuario | `ToggleUserStatusUseCase` — verifica estado actual antes de cambiar | Evitar operaciones redundantes |

### 2.4 F3: Creación de Incidentes (SPEC-002) — Patrones Aplicados

Feature para escalar amenazas de alta severidad a incidentes de seguridad con asignación y seguimiento.

| Patrón | Dónde se aplica | Archivo(s) clave | Problema que resolvió |
|--------|----------------|-------------------|----------------------|
| **Factory Method** | Creación de incidentes con reglas | `Incident.create()` (constructor privado), `IncidentFactory.createFromThreat()` | Validar severidad y duplicados antes de crear |
| **Value Object** | Estado del incidente | `IncidentStatus` enum (`open`, `in_progress`, `resolved`, `closed`) | Lifecycle states con transiciones controladas |
| **Repository Pattern** | Persistencia de incidentes | `IncidentRepository` → `PostgresIncidentRepository` | Abstracción de SQL + índice único parcial |
| **Idempotent Consumer** | Prevención de duplicados | Índice parcial en PostgreSQL `(threat_id) WHERE status IN ('open','in_progress')` | Garantizar que una amenaza no genere 2 incidentes activos |
| **Domain Exception Hierarchy** | Reglas de negocio como excepciones | `ThreatNotFoundException`, `InvalidIncidentCreationError`, `DuplicateIncidentError` | Cada regla rota → excepción específica con código |
| **Audit Log Pattern** | Registro de creación | `AuditLogRepository.log({ action: 'INCIDENT_CREATED' })` | Trazabilidad para auditoría |

### 2.5 F4: Notificaciones y Perfil (EP-01, EP-02, EP-03) — Patrones Aplicados

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
| **Strategy + Factory (FE)** | EP-01 | Validación de amenazas FE | `ThreatValidationFactory` → 5 estrategias de validación | Reglas de validación distintas por tipo de amenaza |

### 2.6 Resumen Consolidado: Patrones por Feature

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                         F1: SISTEMA BASE                              │
  │  Hexagonal · Strategy · Factory · Repository · Composition Root      │
  │  Pub/Sub · Publisher Confirms · Event Envelope · Singleton            │
  └───────────────────────────────┬────────────────────────────────────────┘
                                  │ se construye sobre
  ┌───────────────────────────────▼────────────────────────────────────────┐
  │                                                                        │
  │  ┌─────────────────────────┐    ┌─────────────────────────────────┐   │
  │  │ F2: GESTIÓN USUARIOS    │    │ F3: CREACIÓN INCIDENTES         │   │
  │  │ Repository · Use Case   │    │ Factory · Value Object          │   │
  │  │ Value Object · Audit Log│    │ Repository · Idempotent Consumer│   │
  │  │ Domain Exceptions       │    │ Domain Exceptions · Audit Log   │   │
  │  │ Lazy Singleton          │    │                                 │   │
  │  └─────────────────────────┘    └─────────────────────────────────┘   │
  │                                                                        │
  │  ┌────────────────────────────────────────────────────────────────┐    │
  │  │ F4: NOTIFICACIONES Y PERFIL (Feature principal de la épica)   │    │
  │  │                                                                │    │
  │  │ NUEVOS:  Adapter · Observer · Orchestrator · Strategy (tmpl)  │    │
  │  │          Retry+Backoff · Graceful Degradation · DLX · Pipeline│    │
  │  │          Fan-out · Auto-reconnect · Event History · CQRS-like │    │
  │  │          Queue-Based Load Leveling · Back-pressure · ACK/NACK │    │
  │  │                                                                │    │
  │  │ REUSAN: Repository · Use Case · Pub/Sub · Graceful Shutdown   │    │
  │  └────────────────────────────────────────────────────────────────┘    │
  └────────────────────────────────────────────────────────────────────────┘
```

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

| Clase | Responsabilidad Única |
|-------|----------------------|
| `CreateIncidentUseCase` | Orquestar la creación de un incidente a partir de una amenaza |
| `PostgresThreatRepository` | Persistir y recuperar amenazas en PostgreSQL |
| `ThreatClassifier` | Delegar la clasificación al strategy correcto |
| `IncidentFactory` | Validar reglas de negocio y construir el record del incidente |
| `ThreatValidationFactory` | Instanciar la estrategia de validación según el tipo |

**Evidencia concreta — `CreateIncidentUseCase`:**

```typescript
// application/use-cases/CreateIncidentUseCase.ts
export class CreateIncidentUseCase {
  constructor(
    private readonly threatRepository: ThreatRepository,     // puerto
    private readonly incidentRepository: IncidentRepository, // puerto
    private readonly auditLogRepository: AuditLogRepository, // puerto
  ) {}

  async execute(input: CreateIncidentInput): Promise<CreateIncidentOutput> {
    // 1. Buscar amenaza
    const threat = await this.threatRepository.findById(input.threatId);
    if (!threat) throw new ThreatNotFoundForIncidentError(input.threatId);

    // 2. Validar severidad (regla de negocio del dominio)
    if (threat.severity !== 'high' && threat.severity !== 'critical')
      throw new InvalidIncidentCreationError(input.threatId, threat.severity);

    // 3. Verificar duplicados
    const existing = await this.incidentRepository.findActiveByThreatId(input.threatId);
    if (existing) throw new DuplicateIncidentError(input.threatId);

    // 4. Crear y persistir
    const incident = Incident.create({ /* ... */ });
    const saved = await this.incidentRepository.save(/* record */);

    // 5. Auditoría
    await this.auditLogRepository.log({ action: 'INCIDENT_CREATED', /* ... */ });

    return { incident: saved };
  }
}
```

Este use case **no sabe** si la base de datos es PostgreSQL, MongoDB o un mock en memoria. Solo habla con puertos.

### 4.2 O — Open/Closed Principle (OCP)

**Abierto para extensión, cerrado para modificación.**

El patrón Strategy implementado en `ThreatClassifier` permite agregar nuevos tipos de amenaza sin modificar código existente:

```
                    ┌─────────────────────────┐
                    │    ThreatClassifier      │
                    │  (Contexto Strategy)     │
                    │                         │
                    │  strategies: Map<Type>   │
                    │  classify(context) ──────┼──► delega al strategy correcto
                    └─────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼──────────┐
    │   Malware      │ │  Phishing    │ │  Ransomware     │
    │   Strategy     │ │  Strategy    │ │  Strategy       │
    └────────────────┘ └──────────────┘ └─────────────────┘
```

Para agregar un nuevo tipo (ej: `zero-day`):
1. Crear `ZeroDayClassificationStrategy` implementando `ThreatClassificationStrategy`
2. Registrarlo en `ServiceFactory.getThreatClassifier()`
3. **No se modifica** ni `ThreatClassifier` ni las estrategias existentes

### 4.3 L — Liskov Substitution Principle (LSP)

**Cualquier implementación es sustituible por su interfaz.**

Ejemplo concreto: `StatisticsMockRepositoryImpl` puede reemplazar transparentemente a `StatisticsRepositoryImpl` porque ambas extienden `StatisticsRepository`:

```typescript
// Puerto (abstracción)
export abstract class StatisticsRepository {
  abstract getStatistics(): Observable<ThreatStatistics>;
  abstract getStatisticsSafe(): Observable<ThreatStatistics>;
}

// Implementación real
@Injectable({ providedIn: 'root' })
export class StatisticsRepositoryImpl extends StatisticsRepository { /* HTTP */ }

// Implementación mock (sustituible)
@Injectable()
export class StatisticsMockRepositoryImpl extends StatisticsRepository { /* datos fijos */ }
```

En tests, se inyecta el mock sin cambiar el código del componente consumidor.

### 4.4 I — Interface Segregation Principle (ISP)

**Interfaces pequeñas y enfocadas, sin métodos innecesarios.**

| Puerto | Métodos | Propósito |
|--------|---------|-----------|
| `EventPublisher` | 1 (`publish`) | Solo publicar eventos |
| `AuditLogRepository` | 1 (`log`) | Solo registrar auditoría |
| `TokenService` | 2 (`generateToken`, `verifyToken`) | Solo gestión de JWT |
| `AuthProvider` | 1-2 (`authenticate`, `createUser?`) | Solo autenticación |
| `ThreatClassificationStrategy` | 1 (`analyze`) + 1 prop (`supportedType`) | Solo clasificar |

Ningún consumidor se ve obligado a depender de métodos que no usa. Compárese con una hipotética interfaz monolítica `ISecurityService` con 30 métodos — aquí cada puerto tiene entre 1 y 13 métodos, todos cohesivos.

### 4.5 D — Dependency Inversion Principle (DIP)

**Las capas superiores dependen de abstracciones, no de implementaciones.**

```
  ┌─────────────────────────────────────────────────────────┐
  │                    DOMAIN (centro)                      │
  │   Entities, Ports (interfaces), Value Objects           │
  │   ► NO depende de NADA externo                         │
  └────────────────────────┬────────────────────────────────┘
                           │ define contratos
  ┌────────────────────────▼────────────────────────────────┐
  │                   APPLICATION                           │
  │   Use Cases reciben puertos por constructor             │
  │   ► Depende SOLO de domain/ports                       │
  └────────────────────────┬────────────────────────────────┘
                           │ implementa contratos
  ┌────────────────────────▼────────────────────────────────┐
  │                  INFRASTRUCTURE                         │
  │   PostgresXxxRepository, FirebaseAuthProvider, etc.     │
  │   ServiceFactory (composition root) conecta todo        │
  │   ► Conoce las implementaciones concretas              │
  └─────────────────────────────────────────────────────────┘
```

**Evidencia — `ServiceFactory` como Composition Root:**

```typescript
// infrastructure/factories/ServiceFactory.ts
static getCreateIncidentUseCase(): CreateIncidentUseCase {
  return new CreateIncidentUseCase(
    this.getThreatRepository(),    // → retorna ThreatRepository (interfaz)
    this.getIncidentRepository(),  // → retorna IncidentRepository (interfaz)
    this.getAuditLogRepository(),  // → retorna AuditLogRepository (interfaz)
  );
}

// Internamente:
static getThreatRepository(): ThreatRepository {
  if (!this.threatRepository) {
    this.threatRepository = new PostgresThreatRepository(); // ← ÚNICO lugar que sabe de Postgres
  }
  return this.threatRepository; // ← Retorna la INTERFAZ, no la implementación
}
```

El `CreateIncidentUseCase` nunca ve `PostgresThreatRepository`. Solo ve `ThreatRepository`. Si mañana migramos a MongoDB, cambiamos UNA línea en `ServiceFactory` y el use case no se entera.

**Evidencia — Frontend Angular DI:**

```typescript
// app.config.ts — providers registran la relación abstract → concrete
providers: [
  { provide: ThreatRepository, useClass: ThreatRepositoryImpl },
  { provide: WebSocketRepository, useClass: WebSocketRepositoryImpl },
  { provide: AuthRepository, useClass: AuthRepositoryImpl },
]
```

Los componentes y use cases inyectan `ThreatRepository` (abstracta), Angular resuelve a `ThreatRepositoryImpl` en runtime.

---

## 5. Resolución de Complejidad (Patrones)

### 5.1 Strategy Pattern — Clasificación de Amenazas (Backend)

**Complejidad que resuelve**: Cada tipo de amenaza (malware, phishing, DDoS, ransomware, intrusion) tiene reglas de clasificación radicalmente diferentes: distintos umbrales de riesgo, distintas condiciones de auto-bloqueo, distintas escalaciones de severidad. Sin Strategy, esto sería un bloque monolítico de `if/else` de 200+ líneas.

#### Implementación en 3 capas:

**1. Puerto (contrato) — `domain/ports/ThreatClassificationStrategy.ts`:**

```typescript
export interface ThreatClassificationStrategy {
  readonly supportedType: ThreatType;
  analyze(context: ThreatContext): ThreatAnalysisResult;
}

export interface ThreatAnalysisResult {
  riskScore: number;              // 0-100
  recommendedSeverity: string;
  tags: string[];
  autoBlock: boolean;
}
```

**2. Contexto (orquestador) — `domain/services/ThreatClassifier.ts`:**

```typescript
export class ThreatClassifier {
  private readonly strategies: ReadonlyMap<ThreatType, ThreatClassificationStrategy>;

  constructor(strategies: readonly ThreatClassificationStrategy[]) {
    const strategyMap = new Map<ThreatType, ThreatClassificationStrategy>();
    for (const strategy of strategies) {
      strategyMap.set(strategy.supportedType, strategy);
    }
    this.strategies = strategyMap;
  }

  classify(context: ThreatContext): ThreatAnalysisResult {
    const strategy = this.strategies.get(context.type);
    if (!strategy) return this.defaultAnalysis(context);
    return strategy.analyze(context);
  }
}
```

**3. Estrategias concretas — `infrastructure/classification/ThreatClassificationStrategies.ts`:**

| Estrategia | Tipo | Auto-bloqueo | Escalación de Severidad |
|------------|------|--------------|------------------------|
| `MalwareClassificationStrategy` | malware | riskScore ≥ 90 | riskScore ≥ 80 → critical |
| `IntrusionClassificationStrategy` | intrusion | autoDetected o riskScore ≥ 85 | riskScore ≥ 75 → critical |
| `PhishingClassificationStrategy` | phishing | riskScore ≥ 80 | Preserva original |
| `DdosClassificationStrategy` | ddos | **Siempre** | riskScore ≥ 70 → critical |
| `RansomwareClassificationStrategy` | ransomware | **Siempre** | **Siempre** critical |

**¿Por qué es escalable?** Para agregar soporte para un nuevo tipo de amenaza `zero-day`:
1. Crear `ZeroDayClassificationStrategy` implementando `ThreatClassificationStrategy`
2. Agregarla al array en `ServiceFactory.getThreatClassifier()`
3. Las 5 estrategias existentes y `ThreatClassifier` quedan intactos (OCP)

### 5.2 Strategy + Factory Pattern — Validación de Amenazas (Frontend)

**Complejidad que resuelve**: La validación en el formulario de reporte de amenazas varía según el tipo seleccionado. Cada tipo tiene reglas específicas sobre campos requeridos, severidad mínima y contenido de la descripción.

**Factory Method — `ThreatValidationFactory`:**

```typescript
@Injectable({ providedIn: 'root' })
export class ThreatValidationFactory {
  createValidator(type: ThreatType): ThreatValidationStrategy {
    switch (type) {
      case ThreatType.MALWARE:     return new MalwareValidationStrategy();
      case ThreatType.PHISHING:    return new PhishingValidationStrategy();
      case ThreatType.DDOS:        return new DdosValidationStrategy();
      case ThreatType.RANSOMWARE:  return new RansomwareValidationStrategy();
      default:                     return new DefaultValidationStrategy();
    }
  }
}
```

**Estrategias de validación:**

| Estrategia | Reglas de Negocio |
|------------|-------------------|
| `MalwareValidationStrategy` | Descripción debe mencionar "malware" o "virus"; severidad ≥ medium |
| `PhishingValidationStrategy` | Descripción debe mencionar "phishing" o "email" |
| `DdosValidationStrategy` | Severidad debe ser high o critical |
| `RansomwareValidationStrategy` | Severidad debe ser critical siempre |
| `DefaultValidationStrategy` | Descripción ≥ 10 caracteres, formato de IP válido |

### 5.3 Factory Pattern — Creación de Entidades de Dominio

**Complejidad que resuelve**: Las entidades de dominio requieren validación y defaults consistentes al momento de la creación. El constructor está privatizado para forzar el uso del factory method.

```typescript
// domain/entities/Threat.ts
export class Threat {
  private constructor(/* readonly props */) {}

  static create(props: ThreatProps): Threat {
    return new Threat(
      props.threatId || uuidv4(),                         // ID auto-generado
      props.type,
      props.severity,
      props.sourceIp,
      props.description,
      props.targetIp,
      props.metadata,
      props.timestamp || new Date().toISOString()          // timestamp default
    );
  }

  // Comportamiento de dominio (no getters/setters vacíos)
  isHighSeverity(): boolean { return this.severity === 'high' || this.severity === 'critical'; }
  isCritical(): boolean { return this.severity === 'critical'; }
}
```

### 5.4 Factory Pattern — `IncidentFactory` con Reglas de Negocio

```typescript
// domain/services/IncidentFactory.ts
export class IncidentFactory {
  constructor(private readonly deps: IncidentFactoryDeps) {}

  async createFromThreat(threat: Threat, threatDbId: number): Promise<NewIncidentRecord> {
    // Regla 1: Solo amenazas de alta severidad generan incidentes
    if (!threat.isHighSeverity()) {
      throw new InvalidIncidentCreationError(threatDbId, threat.severity);
    }
    // Regla 2: No duplicar incidentes activos para la misma amenaza
    const alreadyExists = await this.deps.checkExistingIncident(threatDbId);
    if (alreadyExists) throw new DuplicateIncidentError(threatDbId);

    return { /* construye record validado */ };
  }
}
```

### 5.5 Repository Pattern — Abstracción de Persistencia

**Complejidad que resuelve**: Desacoplar la lógica de negocio de la tecnología de almacenamiento.

```
┌──────────────────┐         ┌───────────────────────┐
│   Use Case       │────────►│  ThreatRepository     │ (puerto/interfaz)
│  (application)   │         │   save()              │
└──────────────────┘         │   findAll()           │
                             │   findById()          │
                             │   delete()            │
                             └───────────┬───────────┘
                                         │ implementa
                             ┌───────────▼───────────┐
                             │ PostgresThreatRepo     │ (adaptador)
                             │  → SQL queries         │
                             │  → Connection pool     │
                             └───────────────────────┘
```

**Backend — 6 implementaciones de repositorio:**

| Puerto (Interfaz) | Adaptador (Implementación) | Storage |
|--------------------|-----------------------------|---------|
| `ThreatRepository` | `PostgresThreatRepository` | PostgreSQL |
| `UserRepository` | `PostgresUserRepository` | PostgreSQL |
| `IncidentRepository` | `PostgresIncidentRepository` | PostgreSQL |
| `AuditLogRepository` | `PostgresAuditLogRepository` | PostgreSQL |
| `ThreatStatisticsRepository` | `PostgresThreatStatisticsRepository` | PostgreSQL |
| `NotificationPreferencesRepository` | `RedisNotificationPreferencesRepository` | Redis |

**Frontend — 8 implementaciones:**

| Puerto (Abstract Class) | Adaptador | Medio |
|--------------------------|-----------|-------|
| `ThreatRepository` | `ThreatRepositoryImpl` | HTTP API |
| `AuthRepository` | `AuthRepositoryImpl` | HTTP + LocalStorage |
| `IncidentRepository` | `IncidentRepositoryImpl` | HTTP API |
| `StatisticsRepository` | `StatisticsRepositoryImpl` | HTTP API |
| `UserAdminRepository` | `UserAdminRepositoryImpl` | HTTP API |
| `WebSocketRepository` | `WebSocketRepositoryImpl` | WebSocket nativo |
| `AdminProfileRepository` | `AdminProfileRepositoryImpl` | HTTP API |
| `NotificationPreferencesRepository` | `NotificationPreferencesRepositoryImpl` | HTTP API |

### 5.6 Composition Root / Service Locator — `ServiceFactory`

**Complejidad que resuelve**: Centralizar el wiring de dependencias en un único punto. Sin un contenedor de DI externo (como NestJS), `ServiceFactory` actúa como Composition Root manual con lazy initialization y singleton caching.

Características clave:
- **Lazy Singleton**: cada dependencia se instancia una sola vez, bajo demanda
- **Tipo de retorno = puerto**: los métodos retornan la interfaz, no la clase concreta
- **`resetForTesting()`**: permite limpiar el estado para tests unitarios aislados

```typescript
// ÚNICO archivo que conoce implementaciones concretas
static getThreatClassifier(): ThreatClassifier {
  if (!this.threatClassifier) {
    this.threatClassifier = new ThreatClassifier([
      new MalwareClassificationStrategy(),
      new IntrusionClassificationStrategy(),
      new PhishingClassificationStrategy(),
      new DdosClassificationStrategy(),
      new RansomwareClassificationStrategy(),
    ]);
  }
  return this.threatClassifier;
}
```

---

### 5.7 Arquitectura Orientada a Eventos (EDA) — Patrones

El sistema CyberGuard implementa una **arquitectura orientada a eventos** (Event-Driven Architecture) donde el **Producer** genera eventos de amenazas detectadas y el **Worker** los consume, procesa y reacciona de forma asíncrona. RabbitMQ actúa como broker de mensajes entre ambos servicios.

### 5.7.1 Visión General del Flujo de Eventos

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

### 5.7.2 Publisher/Subscriber con Topic Exchange

**Complejidad que resuelve**: El Producer no necesita saber quién consume sus eventos ni cuántos consumidores hay. El Topic Exchange permite enrutar por routing key sin acoplamiento.

**Evidencia — Producer publica al exchange topic:**

```typescript
// infrastructure/config/rabbitmq.ts
const EXCHANGE = 'cyberguard.events';
await this.channel.assertExchange(EXCHANGE, 'topic', { durable: true });

// application/services/threat.service.ts — routing key dinámico
const routingKey = `threat.detected.${threat.type}`;
await this.eventPublisher.publish(routingKey, event);
```

**Evidencia — Worker se suscribe con wildcard `#`:**

```typescript
// worker/src/config.ts
export const TOPIC = process.env.WORKER_TOPIC || '#';   // escucha todo

// worker/src/rabbitmq.ts
await ch.bindQueue(q.queue, EXCHANGE, TOPIC);            // bind wildcard
```

El Worker recibe **todos** los eventos (`#`), pero si mañana se necesita un Worker especializado solo en `threat.detected.malware`, basta con crear otro consumidor con topic `threat.detected.malware`.

### 5.7.3 Event Envelope (Sobre de Evento)

**Complejidad que resuelve**: Sin una estructura estándar, cada evento tendría un formato diferente, dificultando el logging, la trazabilidad y el debugging.

```typescript
// application/services/threat.service.ts
const event = {
  eventId:   uuidv4(),                                    // ID único del evento
  eventType: 'threat.detected',                           // tipo semántico
  timestamp: threat.timestamp || new Date().toISOString(), // cuándo ocurrió
  data: {                                                  // payload específico
    threatId, type, severity, sourceIp, description, metadata
  }
};
```

Cada evento que entra al broker tiene: **quién** (eventId), **qué** (eventType), **cuándo** (timestamp) y **qué datos** (data). Esto permite correlacionar eventos entre Producer y Worker.

### 5.7.4 Publisher Confirms

**Complejidad que resuelve**: Sin confirmación, el Producer no sabe si el mensaje llegó al broker. Con Publisher Confirms, se obtiene una garantía **at-least-once delivery**.

```typescript
// infrastructure/config/rabbitmq.ts
const ch = await conn.createConfirmChannel();   // ← canal con confirmación

async publishEvent(routingKey: string, data: Record<string, unknown>): Promise<void> {
  const ch = this.getChannel();
  return new Promise<void>((resolve, reject) => {
    ch.publish(EXCHANGE, routingKey, message, { persistent: true },
      (err: unknown) => {
        if (err) {
          logger.error('Event NACK - not confirmed by RabbitMQ', { routingKey });
          reject(err);
        } else {
          logger.info('Event published and confirmed', { routingKey });
          resolve();
        }
      }
    );
  });
}
```

Si el broker rechaza el mensaje (NACK), el error se propaga al caller para que pueda decidir si reintentar.

### 5.7.5 Dead Letter Exchange (DLX)

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

### 5.7.6 Back-pressure y Drain

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

### 5.7.7 Manual ACK/NACK con Auto-reconnect

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

### 5.7.8 Adapter Pattern — Canales de Notificación

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

### 5.7.9 Orchestrator Pattern — Coordinación de Notificaciones

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

### 5.7.10 Graceful Degradation — Fallback a Logging

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

### 5.7.11 Retry con Exponential Backoff

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

### 5.7.12 Strategy Pattern — Templates de Notificación

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

### 5.7.13 Pipeline de Procesamiento (Worker)

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

### 5.7.14 Graceful Shutdown

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

### 5.7.15 Separación CQRS-like (Producer vs Worker)

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

### 7.1 Domain Layer (Cero dependencias de infraestructura)

| Archivo | Imports externos | Frameworks | Lógica de negocio |
|---------|------------------|------------|-------------------|
| `domain/entities/Threat.ts` | `uuid` | Ninguno | `isHighSeverity()`, `isCritical()`, factory `create()` |
| `domain/entities/Incident.ts` | `uuid` | Ninguno | `isActive()`, factory `create()` |
| `domain/ports/ThreatRepository.ts` | Ninguno | Ninguno | Contrato puro |
| `domain/ports/UserRepository.ts` | Ninguno | Ninguno | Contrato puro con 13 operaciones |
| `domain/ports/EventPublisher.ts` | Ninguno | Ninguno | Contrato con 1 método |
| `domain/services/ThreatClassifier.ts` | Ninguno | Ninguno | Strategy context + Map |
| `domain/services/IncidentFactory.ts` | Ninguno | Ninguno | Validación + construcción |
| `domain/exceptions/DomainError.ts` | Ninguno | Ninguno | Base abstracta con `code` |
| `domain/value-objects/IncidentStatus.ts` | Ninguno | Ninguno | Enum + lifecycle helpers |
| `domain/value-objects/UserRole.ts` | Ninguno | Ninguno | Enum + validation |

### 7.2 Application Layer (Solo depende de puertos)

| Archivo | Depende de | NO depende de |
|---------|-----------|---------------|
| `CreateIncidentUseCase` | `ThreatRepository`, `IncidentRepository`, `AuditLogRepository` | PostgreSQL, Express, Redis |
| `ListThreatsUseCase` | `ThreatRepository` | PostgreSQL, Express |
| `CreateUserUseCase` | `UserRepository`, `AuditLogRepository` | PostgreSQL, Firebase |
| `ToggleUserStatusUseCase` | `UserRepository`, `AuditLogRepository`, `IncidentRepository` | PostgreSQL |

### 7.3 Infrastructure Layer (Implementa puertos)

| Archivo | Implementa | Usa tecnología |
|---------|-----------|----------------|
| `PostgresThreatRepository` | `ThreatRepository` | PostgreSQL (pg) |
| `PostgresUserRepository` | `UserRepository` | PostgreSQL (pg) |
| `RedisNotificationPreferencesRepository` | `NotificationPreferencesRepository` | Redis (ioredis) |
| `RabbitMQPublisher` | `EventPublisher` | amqplib |
| `FirebaseAuthProvider` | `AuthProvider` | firebase-admin |
| `JWTTokenService` | `TokenService` | jsonwebtoken |
| `ServiceFactory` | Composition Root | Todas las concretas |

### 7.4 Resumen de Cobertura de Tests

| Suite | Archivos | Tests | Estado |
|-------|----------|-------|--------|
| Frontend (Vitest) | 57 | 550 | ✅ 100% passed |
| Backend Producer (Jest) | 48 | 911 | ✅ 100% passed |
| Backend Worker (Jest) | 10 | 151 | ✅ 100% passed |
| **Total** | **115** | **1,612** | **✅ All green** |

---

## Resumen de Patrones y Principios

### Patrones en Arquitectura Hexagonal y SOLID

| Patrón / Principio | Dónde se aplica | Problema que resuelve |
|--------------------|-----------------|-----------------------|
| **Hexagonal Architecture** | Todo el sistema (BE + FE) | Aislamiento del dominio de frameworks |
| **Strategy Pattern** | Clasificación de amenazas (BE), Validación (FE) | Eliminar `if/else` monolíticos; extensibilidad OCP |
| **Factory Method** | `ThreatValidationFactory`, `Threat.create()`, `Incident.create()` | Creación controlada de objetos con validación |
| **Repository Pattern** | 6 repos BE + 8 repos FE | Abstracción de persistencia/comunicación |
| **Composition Root** | `ServiceFactory` (BE), `app.config.ts` (FE) | Centralizar el wiring; DIP estricto |
| **Value Object** | `IncidentStatus`, `UserRole` | Encapsular estado válido del dominio |
| **Domain Exception Hierarchy** | `DomainError` → 10 subclases | Manejo de errores tipado y estructurado |
| **SRP** | 13 use cases, 10 puertos, 6 repos | Cada clase tiene una razón de cambio |
| **OCP** | Strategy pattern, Repository pattern | Extensible sin modificar código existente |
| **LSP** | Mock repos sustituyen reales en tests | Sustitución transparente de implementaciones |
| **ISP** | Puertos con 1-3 métodos promedio | Sin interfaces infladas |
| **DIP** | Use cases → puertos; Factory → concretas | High-level no depende de low-level |

### Patrones en Arquitectura Orientada a Eventos (EDA)

| Patrón / Principio | Dónde se aplica | Problema que resuelve |
|--------------------|-----------------|-----------------------|
| **Publisher/Subscriber (Topic Exchange)** | Producer → RabbitMQ → Worker | Desacoplamiento total entre el generador del evento y sus consumidores |
| **Event Envelope** | `ThreatService.reportThreat()` | Estructura estándar (`eventId`, `eventType`, `timestamp`, `data`) para trazabilidad |
| **Publisher Confirms** | `RabbitMQConnection.publishEvent()` | Garantía de que el broker recibió el mensaje (at-least-once delivery) |
| **Dead Letter Exchange (DLX)** | `cyberguard.dlx` + `failed.messages` queue | Captura de mensajes que fallan el procesamiento sin perderlos |
| **Manual ACK/NACK** | Worker `rabbitmq.ts` — `noAck: false` | Control explícito de cuándo un mensaje se considera procesado |
| **Back-pressure (Drain)** | `RabbitMQConnection.publishEvent()` | Previene overflow del buffer cuando el broker está saturado |
| **Auto-reconnect** | Worker `rabbitmq.ts` — `setTimeout(2s)` | Resiliencia ante caídas temporales de RabbitMQ |
| **Wildcard Subscription** | Worker `config.ts` — topic `#` | Suscripción a todos los eventos sin acoplarse a routing keys específicos |
| **Adapter Pattern** | `INotificationService` → `EmailAdapter`, `WhatsAppAdapter`, `LogNotificationAdapter` | Intercambio transparente de canales de notificación |
| **Orchestrator Pattern** | `NotificationOrchestrator.dispatch()` | Coordinación paralela de múltiples canales con `Promise.allSettled` |
| **Strategy Pattern (Templates)** | `category-template.strategy.ts` | Selección de contenido de notificación según tipo de amenaza |
| **Retry con Exponential Backoff** | `EmailAdapter`, `WhatsAppAdapter` | Tolerancia a fallos transitorios de APIs externas |
| **Graceful Degradation** | `buildOrchestrator()` → `LogNotificationAdapter` | Funcionamiento sin APIs configuradas (fallback a logging) |
| **Pipeline de Procesamiento** | Worker `index.ts` → `handleMessage → saveToRedis → broadcast → dispatch` | Flujo secuencial y predecible para cada mensaje |
| **Event History (Cache)** | Worker `redis.ts` — lista `cg:ws:history` (cap 200) | Re-envío de historial a nuevos clientes WebSocket |
| **Fan-out a Usuarios** | Worker `index.ts` — loop sobre `allPrefs` | Cada evento notifica a todos los usuarios con preferencias activas |
| **Graceful Shutdown** | `SIGINT` handler en ambos servicios | Cierre ordenado de conexiones (RabbitMQ → Redis → WebSocket) |
| **Separación CQRS-like** | Producer (write) vs Worker (read/react) | Procesos independientes para escritura de datos y reacción a eventos |
